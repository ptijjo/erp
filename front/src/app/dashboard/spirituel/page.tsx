"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Send, Sparkles, Trash2, Users } from "lucide-react";

import { OrganizationSelectField } from "~/app/dashboard/_components/OrganizationSelectField";
import {
  SPIRITUAL_PARTICIPATION_RESPONSE_LABEL,
  SPIRITUAL_STATUS_LABEL,
} from "~/app/dashboard/_lib/pole-status-labels";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type {
  SpiritualEventDto,
  SpiritualEventParticipationsDto,
  SpiritualEventStatusDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { formatDisplayDate, toDateInputValue } from "~/lib/date-input";
import { useScopedOrganizations } from "~/lib/use-scoped-organizations";

const STATUS_OPTIONS = Object.entries(SPIRITUAL_STATUS_LABEL) as [
  SpiritualEventStatusDto,
  string,
][];

export default function SpirituelPage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { main, selectableOrgs, defaultOrganizationId } =
    useScopedOrganizations();

  const canRead =
    me != null && hasMePermission(me, "read", "SpiritualEvent");
  const canCreate =
    me != null && hasMePermission(me, "create", "SpiritualEvent");
  const canUpdate =
    me != null && hasMePermission(me, "update", "SpiritualEvent");
  const canDelete =
    me != null && hasMePermission(me, "delete", "SpiritualEvent");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [participationEventId, setParticipationEventId] = useState<string | null>(
    null,
  );
  const [organizationId, setOrganizationId] = useState("");
  const formOrganizationId = organizationId || defaultOrganizationId;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [status, setStatus] = useState<SpiritualEventStatusDto>("PLANNED");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["spiritual", "events"] as const,
    queryFn: async () => {
      const { data } = await api.get<SpiritualEventDto[]>("/spiritual/events");
      return data;
    },
    enabled: canRead,
  });

  const { data: participations, isLoading: participationsLoading } = useQuery({
    queryKey: ["spiritual", "participations", participationEventId] as const,
    queryFn: async () => {
      const { data } = await api.get<SpiritualEventParticipationsDto>(
        `/spiritual/events/${participationEventId}/participations`,
      );
      return data;
    },
    enabled: canRead && participationEventId != null,
  });

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setLocation("");
    setEventDate("");
    setStatus("PLANNED");
    setOrganizationId("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const orgId = main ? formOrganizationId : me!.organisationId;
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        eventDate: eventDate || undefined,
        status,
      };
      if (editingId) {
        await api.patch(`/spiritual/events/${editingId}`, body);
      } else {
        await api.post("/spiritual/events", {
          organizationId: orgId,
          ...body,
        });
      }
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["spiritual"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Enregistrement impossible"));
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { data } = await api.post<{
        groupWide: boolean;
        invitationsSent: number;
        mainOrganizationCount: number;
        subsidiaryCount: number;
        invitationsByOrganization: { name: string; count: number }[];
      }>(`/spiritual/events/${eventId}/publish`);
      return data;
    },
    onSuccess: async (data) => {
      const orgLines = data.invitationsByOrganization
        .map((o) => `${o.name} : ${o.count}`)
        .join("\n");
      alert(
        `Envoi général effectué : ${data.invitationsSent} invitation(s).\n` +
          `Maison mère : ${data.mainOrganizationCount} · Filiales : ${data.subsidiaryCount}\n\n` +
          orgLines,
      );
      await queryClient.invalidateQueries({ queryKey: ["spiritual"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Publication impossible"));
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { data } = await api.post<{ added: number; totalInvited: number }>(
        `/spiritual/events/${eventId}/sync-invitations`,
      );
      return data;
    },
    onSuccess: async (data) => {
      alert(
        data.added > 0
          ? `${data.added} nouvelle(s) invitation(s) envoyée(s) (${data.totalInvited} au total).`
          : `Tous les comptes actifs sont déjà invités (${data.totalInvited}).`,
      );
      await queryClient.invalidateQueries({ queryKey: ["spiritual"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Synchronisation impossible"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/spiritual/events/${id}`);
    },
    onSuccess: async () => {
      if (participationEventId) {
        setParticipationEventId(null);
      }
      await queryClient.invalidateQueries({ queryKey: ["spiritual"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Suppression impossible"));
    },
  });

  function startEdit(row: SpiritualEventDto) {
    setEditingId(row.id);
    setOrganizationId(row.organizationId);
    setTitle(row.title);
    setDescription(row.description ?? "");
    setLocation(row.location ?? "");
    setEventDate(toDateInputValue(row.eventDate));
    setStatus(row.status);
  }

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Spirituel"
          description="Vous n'avez pas accès aux événements spirituels."
        />
      </PageShell>
    );
  }

  const orgName = (id: string) =>
    selectableOrgs.find((o) => o.id === id)?.name ?? id.slice(0, 8);

  return (
    <PageShell>
      <PageHeader
        title="Spirituel"
        description="Événements cultuels du groupe. La publication envoie une invitation à tous les collaborateurs connectés — maison mère et filiales."
      />

      {(canCreate || canUpdate) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              {editingId ? "Modifier l'événement" : "Nouvel événement"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {main && !editingId ? (
              <>
                <OrganizationSelectField
                  id="spiritual-org"
                  label="Organisation organisatrice"
                  organizations={selectableOrgs}
                  value={formOrganizationId}
                  onChange={setOrganizationId}
                />
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  L’organisation indiquée est l’organisateur de l’événement.
                  La publication concerne tout le groupe VIFAA (maison mère et
                  filiales).
                </p>
              </>
            ) : null}
            <div>
              <Label htmlFor="spiritual-title">Titre</Label>
              <Input
                id="spiritual-title"
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="spiritual-location">Lieu</Label>
              <Input
                id="spiritual-location"
                className="mt-1"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="spiritual-date">Date</Label>
              <Input
                id="spiritual-date"
                type="date"
                className="mt-1"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as SpiritualEventStatusDto)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="spiritual-desc">Description</Label>
              <textarea
                id="spiritual-desc"
                className="mt-1 w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                disabled={
                  !title.trim() ||
                  saveMutation.isPending ||
                  (main && !editingId && !formOrganizationId)
                }
                onClick={() => saveMutation.mutate()}
              >
                {editingId ? "Enregistrer" : "Créer"}
              </Button>
              {editingId ? (
                <Button variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Événements ({events.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun événement.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Titre</th>
                    <th className="pb-2 pr-4">Organisation</th>
                    <th className="pb-2 pr-4">Lieu</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Statut</th>
                    <th className="pb-2 pr-4">Invitations</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {events.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 font-medium">{row.title}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {orgName(row.organizationId)}
                      </td>
                      <td className="py-2 pr-4">{row.location ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {formatDisplayDate(row.eventDate)}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary">
                          {SPIRITUAL_STATUS_LABEL[row.status]}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        {row.publishedAt ? (
                          <span className="text-xs text-muted-foreground">
                            Envoyées le{" "}
                            {formatDisplayDate(row.publishedAt)}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700">
                            Non publié
                          </span>
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {canUpdate &&
                          !row.publishedAt &&
                          row.status !== "CANCELLED" &&
                          row.status !== "COMPLETED" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={publishMutation.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Publier « ${row.title} » ?\n\nEnvoi général à tous les comptes actifs du groupe (maison mère + toutes les filiales).`,
                                  )
                                ) {
                                  publishMutation.mutate(row.id);
                                }
                              }}
                            >
                              <Send className="mr-1 size-3.5" />
                              Publier
                            </Button>
                          ) : null}
                          {row.publishedAt ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setParticipationEventId(
                                    participationEventId === row.id
                                      ? null
                                      : row.id,
                                  )
                                }
                              >
                                <Users className="mr-1 size-3.5" />
                                Réponses
                              </Button>
                              {canUpdate ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={syncMutation.isPending}
                                  onClick={() => syncMutation.mutate(row.id)}
                                >
                                  Synchroniser
                                </Button>
                              ) : null}
                            </>
                          ) : null}
                          {canUpdate ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Modifier"
                              onClick={() => startEdit(row)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Supprimer"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Supprimer « ${row.title} » ?`,
                                  )
                                ) {
                                  deleteMutation.mutate(row.id);
                                }
                              }}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {participationEventId ? (
        <ParticipationPanel
          loading={participationsLoading}
          data={participations}
          onClose={() => setParticipationEventId(null)}
        />
      ) : null}
    </PageShell>
  );
}

function ParticipationPanel({
  loading,
  data,
  onClose,
}: {
  loading: boolean;
  data: SpiritualEventParticipationsDto | undefined;
  onClose: () => void;
}) {
  if (loading) {
    return (
      <Card className="mt-6">
        <CardContent className="py-6 text-sm text-muted-foreground">
          Chargement des participations…
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { summary } = data;

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">
            Participations — {data.event.title}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Présence probable : {summary.likelyAttendance} · Écartés (non +
            sans réponse) : {summary.excluded}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Fermer
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          <StatBox label="Participe" value={summary.accepted} />
          <StatBox label="Ne participe pas" value={summary.declined} />
          <StatBox label="Sans réponse" value={summary.pending} />
          <StatBox
            label="Sans fiche RH"
            value={summary.withoutEmployeeRecord}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2 pr-4">Employé</th>
                <th className="pb-2 pr-4">Filiale</th>
                <th className="pb-2 pr-4">Réponse</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.participations.map((row) => {
                const displayName =
                  row.employee != null
                    ? `${row.employee.firstName} ${row.employee.lastName}`
                    : [row.user.firstName, row.user.lastName]
                        .filter(Boolean)
                        .join(" ") || row.user.email;
                const orgName =
                  row.employee?.organization.name ??
                  row.user.organization.name;
                return (
                <tr key={row.id}>
                  <td className="py-2 pr-4">{displayName}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {orgName}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge
                      variant={
                        row.response === "ACCEPTED"
                          ? "default"
                          : row.response === "DECLINED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {SPIRITUAL_PARTICIPATION_RESPONSE_LABEL[row.response]}
                    </Badge>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
