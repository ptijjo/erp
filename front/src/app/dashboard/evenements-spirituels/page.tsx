"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarHeart, Check, X } from "lucide-react";

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
import { api } from "~/lib/api";
import type {
  SpiritualEventInvitationDto,
  SpiritualParticipationResponseDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { formatDisplayDate } from "~/lib/date-input";
import { SPIRITUAL_PARTICIPATION_RESPONSE_LABEL } from "~/app/dashboard/_lib/pole-status-labels";

function responseBadgeVariant(
  response: SpiritualParticipationResponseDto,
): "default" | "secondary" | "destructive" | "outline" {
  switch (response) {
    case "ACCEPTED":
      return "default";
    case "DECLINED":
      return "destructive";
    case "PENDING":
      return "secondary";
    default: {
      const _exhaustive: never = response;
      return _exhaustive;
    }
  }
}

export default function EvenementsSpirituelsPage() {
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["spiritual", "my-invitations"] as const,
    queryFn: async () => {
      const { data } = await api.get<SpiritualEventInvitationDto[]>(
        "/spiritual/my-invitations",
      );
      return data;
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({
      id,
      response,
    }: {
      id: string;
      response: "ACCEPTED" | "DECLINED";
    }) => {
      await api.patch(`/spiritual/participations/${id}/response`, { response });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["spiritual"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible d’enregistrer votre réponse"));
    },
  });

  const openInvitations = invitations.filter(
    (row) => row.response === "PENDING",
  );
  const answeredInvitations = invitations.filter(
    (row) => row.response !== "PENDING",
  );

  return (
    <PageShell>
      <PageHeader
        title="Événements"
        description="Invitations aux événements du groupe (maison mère et filiales)."
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarHeart className="size-4" />
            Invitations en attente ({openInvitations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : openInvitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune invitation en attente de réponse.
            </p>
          ) : (
            openInvitations.map((row) => (
              <InvitationCard
                key={row.id}
                row={row}
                busy={respondMutation.isPending}
                onRespond={(response) =>
                  respondMutation.mutate({ id: row.id, response })
                }
              />
            ))
          )}
        </CardContent>
      </Card>

      {answeredInvitations.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Vos réponses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {answeredInvitations.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{row.event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDisplayDate(row.event.eventDate)}
                    {row.event.location ? ` — ${row.event.location}` : ""}
                  </p>
                </div>
                <Badge variant={responseBadgeVariant(row.response)}>
                  {SPIRITUAL_PARTICIPATION_RESPONSE_LABEL[row.response]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </PageShell>
  );
}

function InvitationCard({
  row,
  busy,
  onRespond,
}: {
  row: SpiritualEventInvitationDto;
  busy: boolean;
  onRespond: (response: "ACCEPTED" | "DECLINED") => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{row.event.title}</p>
          {row.event.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {row.event.description}
            </p>
          ) : null}
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">Date :</span>{" "}
            {formatDisplayDate(row.event.eventDate)}
          </p>
          {row.event.location ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Lieu :</span>{" "}
              {row.event.location}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => onRespond("ACCEPTED")}
          >
            <Check className="mr-1 size-4" />
            Je participe
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onRespond("DECLINED")}
          >
            <X className="mr-1 size-4" />
            Je ne participe pas
          </Button>
        </div>
      </div>
    </div>
  );
}
