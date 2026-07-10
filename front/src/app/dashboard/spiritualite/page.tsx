"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Newspaper, Pencil, Send, Trash2 } from "lucide-react";
import { useState } from "react";

import { OrganizationSelectField } from "~/app/dashboard/_components/OrganizationSelectField";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { hasMePermission, useMe, type Me } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { SpiritualArticleDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { formatDisplayDate } from "~/lib/date-input";
import { useScopedOrganizations } from "~/lib/use-scoped-organizations";

const MIN_CONTENT_LENGTH = 10;

function canManageSpiritualArticles(me: Me): boolean {
  return (
    hasMePermission(me, "create", "SpiritualArticle") ||
    hasMePermission(me, "update", "SpiritualArticle") ||
    me.role.name === "DIRECTOR_TRADITIONAL_SPIRITUAL"
  );
}

function authorLabel(author: SpiritualArticleDto["author"]): string {
  const name = [author.firstName, author.lastName].filter(Boolean).join(" ");
  return name || author.email;
}

function excerpt(content: string, max = 160): string {
  const flat = content.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1)}…`;
}

export default function SpiritualiteCanalPage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const {
    main,
    selectableOrgs,
    defaultOrganizationId,
    isLoading: orgsLoading,
  } = useScopedOrganizations();

  const canRead =
    me != null && hasMePermission(me, "read", "SpiritualArticle");
  const canManage = me != null && canManageSpiritualArticles(me);

  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  const formOrganizationId = organizationId || defaultOrganizationId;
  const contentLength = content.trim().length;
  const canSubmitDraft =
    title.trim().length >= 3 &&
    contentLength >= MIN_CONTENT_LENGTH &&
    (!main || !!formOrganizationId) &&
    !orgsLoading;

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["spiritual", "articles", "feed"] as const,
    queryFn: async () => {
      const { data } = await api.get<SpiritualArticleDto[]>(
        "/spiritual/articles",
      );
      return data;
    },
    enabled: canRead,
  });

  const { data: drafts = [] } = useQuery({
    queryKey: ["spiritual", "articles", "manage"] as const,
    queryFn: async () => {
      const { data } = await api.get<SpiritualArticleDto[]>(
        "/spiritual/articles/manage",
      );
      return data.filter((a) => a.status === "DRAFT");
    },
    enabled: canManage,
  });

  function openEditor(article?: SpiritualArticleDto) {
    setFormError(null);
    setFormNotice(null);
    if (article) {
      setEditingId(article.id);
      setTitle(article.title);
      setContent(article.content);
      setOrganizationId(article.organizationId);
    } else {
      setEditingId(null);
      setTitle("");
      setContent("");
      setOrganizationId(defaultOrganizationId);
    }
    setCoverFile(null);
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingId(null);
    setTitle("");
    setContent("");
    setCoverFile(null);
    setOrganizationId("");
    setFormError(null);
    setFormNotice(null);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      setFormNotice(null);

      let articleId = editingId;
      if (editingId) {
        await api.patch(`/spiritual/articles/${editingId}`, {
          title: title.trim(),
          content: content.trim(),
        });
      } else {
        const orgId = main ? formOrganizationId : me!.organisationId;
        const { data } = await api.post<SpiritualArticleDto>(
          "/spiritual/articles",
          {
            organizationId: orgId,
            title: title.trim(),
            content: content.trim(),
          },
        );
        articleId = data.id;
      }

      if (coverFile && articleId) {
        const form = new FormData();
        form.append("cover", coverFile);
        try {
          await api.post(`/spiritual/articles/${articleId}/cover`, form);
        } catch (coverError) {
          return {
            articleId,
            coverWarning: apiErrorMessage(
              coverError,
              "L’article est enregistré mais la photo n’a pas pu être envoyée.",
            ),
          };
        }
      }

      return { articleId, coverWarning: null as string | null };
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["spiritual"] });
      if (result?.coverWarning) {
        setFormNotice(result.coverWarning);
        setShowEditor(false);
        setCoverFile(null);
        return;
      }
      closeEditor();
    },
    onError: (e) => {
      setFormError(apiErrorMessage(e, "Enregistrement impossible"));
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/spiritual/articles/${id}/publish`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["spiritual"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Publication impossible"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/spiritual/articles/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["spiritual"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Suppression impossible"));
    },
  });

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Canal spiritualité"
          description="Vous n'avez pas accès à ce canal."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Canal spiritualité"
        description="Actualités et enseignements du pôle spiritualité — visible par tout le groupe VIFAA."
        actions={
          canManage ? (
            <Button onClick={() => openEditor()}>Rédiger un article</Button>
          ) : undefined
        }
      />

      {formNotice ? (
        <p
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          {formNotice}
        </p>
      ) : null}

      {canManage && showEditor ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Modifier l'article" : "Nouvel article"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {main && !editingId ? (
              orgsLoading ? (
                <p className="text-sm text-muted-foreground">
                  Chargement des organisations…
                </p>
              ) : selectableOrgs.length > 0 ? (
                <OrganizationSelectField
                  id="article-org"
                  label="Organisation éditrice"
                  organizations={selectableOrgs}
                  value={formOrganizationId}
                  onChange={setOrganizationId}
                />
              ) : (
                <p className="text-sm text-destructive">
                  Aucune organisation disponible pour créer l’article.
                </p>
              )
            ) : null}

            <div>
              <Label htmlFor="article-title">Titre</Label>
              <Input
                id="article-title"
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                minLength={3}
              />
              {title.trim().length > 0 && title.trim().length < 3 ? (
                <p className="mt-1 text-xs text-destructive">
                  Au moins 3 caractères pour le titre.
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="article-content">Contenu</Label>
              <textarea
                id="article-content"
                className="mt-1 min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Minimum {MIN_CONTENT_LENGTH} caractères ({contentLength}/
                {MIN_CONTENT_LENGTH}).
              </p>
            </div>

            <div>
              <Label htmlFor="article-cover">
                Photo d’illustration (facultatif)
              </Label>
              <Input
                id="article-cover"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="mt-1"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!canSubmitDraft || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending
                  ? "Enregistrement…"
                  : editingId
                    ? "Enregistrer le brouillon"
                    : "Créer le brouillon"}
              </Button>
              <Button variant="outline" onClick={closeEditor}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {canManage && drafts.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">
              Brouillons ({drafts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{draft.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Modifié le {formatDisplayDate(draft.updatedAt)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditor(draft)}
                  >
                    <Pencil className="mr-1 size-3.5" />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    disabled={publishMutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Publier « ${draft.title} » ?\n\nNotification envoyée à tout le groupe.`,
                        )
                      ) {
                        publishMutation.mutate(draft.id);
                      }
                    }}
                  >
                    <Send className="mr-1 size-3.5" />
                    Publier
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Supprimer"
                    onClick={() => {
                      if (window.confirm(`Supprimer « ${draft.title} » ?`)) {
                        deleteMutation.mutate(draft.id);
                      }
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Newspaper className="size-4" />
            Publications ({articles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun article publié pour le moment.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/dashboard/spiritualite/${article.id}`}
                  className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
                >
                  {article.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.coverImageUrl}
                      alt=""
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-muted/50 text-muted-foreground">
                      <Newspaper className="size-10 opacity-40" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        Spiritualité
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDisplayDate(article.publishedAt)}
                      </span>
                    </div>
                    <h3 className="font-semibold leading-snug group-hover:text-primary">
                      {article.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {excerpt(article.content)}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {authorLabel(article.author)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
