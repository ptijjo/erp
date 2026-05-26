"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/lib/api";
import type {
  SessionCaisseCurrentDto,
  SessionCaisseDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionCaisseCurrentDto;
  draftVenteId?: string | null;
  draftVenteHasLines?: boolean;
  onClosed: () => void;
};

export function CaisseCloseSessionDialog({
  open,
  onOpenChange,
  session,
  draftVenteId = null,
  draftVenteHasLines = false,
  onClosed,
}: Props) {
  const queryClient = useQueryClient();
  const [fondCloture, setFondCloture] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const theorique = session.live.theoriqueCaisseEspecesFcfa;

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (draftVenteHasLines) {
        throw new Error(
          "Validez la vente en cours ou videz le panier avant la fin de service.",
        );
      }
      if (draftVenteId) {
        await api.post(`/vente/${draftVenteId}/cancel`);
      }
      const fond = parseDecimal(fondCloture);
      if (Number.isNaN(fond) || fond < 0) {
        throw new Error("Indiquez le montant réel en caisse (≥ 0).");
      }
      const { data } = await api.post<SessionCaisseDto>(
        `/session-caisse/${session.id}/close`,
        {
          fondCloture: fond,
          commentaireCloture: commentaire.trim() || undefined,
        },
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["session-caisse", "current"], null);
      void queryClient.invalidateQueries({ queryKey: ["session-caisse", "mine"] });
      onOpenChange(false);
      const ecart = data.ecartCloture != null ? parseDecimal(data.ecartCloture) : 0;
      const ecartLabel =
        ecart === 0
          ? "Aucun écart sur les espèces."
          : ecart > 0
            ? `Excédent de ${formatFcfa(ecart)} en caisse.`
            : `Manquant de ${formatFcfa(Math.abs(ecart))} en caisse.`;
      alert(`Fin de service enregistrée. ${ecartLabel}`);
      onClosed();
    },
  });

  if (!open) return null;

  const fondSaisi = fondCloture.trim() ? parseDecimal(fondCloture) : null;
  const ecartPreview =
    fondSaisi != null && !Number.isNaN(fondSaisi)
      ? fondSaisi - theorique
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="close-session-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl">
        <h2 id="close-session-title" className="text-lg font-semibold">
          Fin de service
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Comptez les espèces en caisse. Le système compare avec le fond
          d’ouverture et les ventes en espèces de votre session.
        </p>

        <div className="mt-4 space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
          <p>
            <span className="text-muted-foreground">Ventes : </span>
            <strong>{session.live.nombreVentes}</strong> pour{" "}
            <strong>{formatFcfa(session.live.totalVentesFcfa)}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">Espèces encaissées : </span>
            <strong>{formatFcfa(session.live.totalEspecesFcfa)}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">Carte / mobile : </span>
            {formatFcfa(session.live.totalCarteFcfa)} /{" "}
            {formatFcfa(session.live.totalMobileMoneyFcfa)}
          </p>
          <p className="border-t pt-2 font-medium">
            Caisse espèces attendue : {formatFcfa(theorique)}
          </p>
        </div>

        {draftVenteHasLines ? (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Un panier en cours contient des articles : validez la vente ou videz
            le panier avant de clôturer.
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="fond-cloture">Montant réel en caisse (FCFA)</Label>
            <Input
              id="fond-cloture"
              value={fondCloture}
              onChange={(e) => setFondCloture(e.target.value)}
              inputMode="decimal"
              className="mt-1"
              autoFocus
            />
            {ecartPreview != null && !Number.isNaN(ecartPreview) ? (
              <p
                className={`mt-1 text-sm ${
                  ecartPreview === 0
                    ? "text-muted-foreground"
                    : ecartPreview > 0
                      ? "text-amber-700"
                      : "text-destructive"
                }`}
              >
                Écart prévu : {formatFcfa(ecartPreview)}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="commentaire-cloture">Commentaire (optionnel)</Label>
            <textarea
              id="commentaire-cloture"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={2}
              className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          {closeMutation.isError ? (
            <p className="text-sm text-destructive">
              {apiErrorMessage(closeMutation.error, "Clôture impossible")}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => closeMutation.mutate()}
            disabled={
              closeMutation.isPending ||
              !fondCloture.trim() ||
              draftVenteHasLines
            }
          >
            Clôturer la session
          </Button>
        </div>
      </div>
    </div>
  );
}
