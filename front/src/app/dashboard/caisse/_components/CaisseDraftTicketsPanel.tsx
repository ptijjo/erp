"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "~/components/ui/button";
import { api } from "~/lib/api";
import type { VenteDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

type Props = {
  drafts: VenteDto[];
  activeVenteId: string | null;
  sessionId: string;
  onSelectDraft: (venteId: string) => void;
};

export function CaisseDraftTicketsPanel({
  drafts,
  activeVenteId,
  sessionId,
  onSelectDraft,
}: Props) {
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: async (venteId: string) => {
      const { data } = await api.post<VenteDto>(`/vente/${venteId}/cancel`);
      return data;
    },
    onSuccess: (_data, cancelledId) => {
      void queryClient.invalidateQueries({
        queryKey: ["vente", "drafts", sessionId],
      });
      if (cancelledId === activeVenteId) {
        onSelectDraft("");
      }
    },
    onError: (error) => {
      alert(apiErrorMessage(error, "Impossible d’annuler ce ticket"));
    },
  });

  if (drafts.length <= 1) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-sm text-amber-950">
      <p className="font-semibold">
        {drafts.length} tickets en brouillon dans cette session
      </p>
      <p className="mt-1 text-amber-900/90">
        Seul le ticket actif est visible dans le panier. Ouvrez ou annulez les
        autres avant la fin de service.
      </p>
      <ul className="mt-3 space-y-2">
        {drafts.map((draft) => {
          const isActive = draft.id === activeVenteId;
          const lineCount = draft.lines.length;
          const total = formatFcfa(parseDecimal(draft.totalAmount));

          return (
            <li
              key={draft.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2"
            >
              <div>
                <p className="font-medium">
                  {isActive ? "Ticket actif" : "Ticket en attente"}
                  {lineCount > 0
                    ? ` · ${lineCount} article(s) · ${total}`
                    : " · vide"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(draft.createdAt).toLocaleTimeString("fr-FR")}
                </p>
              </div>
              <div className="flex gap-2">
                {!isActive ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectDraft(draft.id)}
                  >
                    Ouvrir
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(draft.id)}
                >
                  Annuler
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
