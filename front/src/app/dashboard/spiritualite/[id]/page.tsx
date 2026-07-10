"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Newspaper } from "lucide-react";
import { useParams } from "next/navigation";

import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
} from "~/components/ui/card";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { SpiritualArticleDto } from "~/lib/api-types";
import { formatDisplayDate } from "~/lib/date-input";

function authorLabel(author: SpiritualArticleDto["author"]): string {
  const name = [author.firstName, author.lastName].filter(Boolean).join(" ");
  return name || author.email;
}

export default function SpiritualiteArticlePage() {
  const params = useParams<{ id: string }>();
  const articleId = params.id;
  const { data: me } = useMe();
  const canRead =
    me != null && hasMePermission(me, "read", "SpiritualArticle");

  const { data: article, isLoading, isError } = useQuery({
    queryKey: ["spiritual", "articles", articleId] as const,
    queryFn: async () => {
      const { data } = await api.get<SpiritualArticleDto>(
        `/spiritual/articles/${articleId}`,
      );
      return data;
    },
    enabled: canRead && !!articleId,
  });

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader title="Article" description="Accès refusé." />
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
      </PageShell>
    );
  }

  if (isError || !article) {
    return (
      <PageShell>
        <PageHeader title="Article introuvable" />
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/spiritualite">
            <ArrowLeft className="mr-2 size-4" />
            Retour au canal
          </Link>
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/spiritualite">
            <ArrowLeft className="mr-2 size-4" />
            Canal spiritualité
          </Link>
        </Button>
      </div>

      <article className="mx-auto max-w-3xl">
        {article.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverImageUrl}
            alt=""
            className="mb-6 w-full rounded-xl object-cover max-h-[420px]"
          />
        ) : (
          <div className="mb-6 flex aspect-[21/9] items-center justify-center rounded-xl bg-muted/50">
            <Newspaper className="size-16 text-muted-foreground/40" />
          </div>
        )}

        <PageHeader
          title={article.title}
          description={`${authorLabel(article.author)} · ${formatDisplayDate(article.publishedAt)} · ${article.organization.name}`}
        />

        <Card className="mt-6">
          <CardContent className="prose prose-neutral max-w-none whitespace-pre-wrap pt-6 text-base leading-relaxed dark:prose-invert">
            {article.content}
          </CardContent>
        </Card>
      </article>
    </PageShell>
  );
}
