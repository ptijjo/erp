"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/lib/api";
import type { SessionCaisseCurrentDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { parseDecimal } from "~/lib/parse-decimal";

type Props = {
  onOpened: () => void;
};

export function CaisseOpenSession({ onOpened }: Props) {
  const queryClient = useQueryClient();
  const [fond, setFond] = useState("");

  const openMutation = useMutation({
    mutationFn: async () => {
      const fondOuverture = parseDecimal(fond);
      if (Number.isNaN(fondOuverture) || fondOuverture < 0) {
        throw new Error("Indiquez un fond de caisse valide (≥ 0).");
      }
      const { data } = await api.post<SessionCaisseCurrentDto>(
        "/session-caisse/open",
        { fondOuverture },
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["session-caisse", "current"], data);
      onOpened();
    },
  });

  return (
    <div className="mx-auto max-w-md rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 text-primary">
        <Wallet className="size-5" />
        <h2 className="text-lg font-semibold">Début de service</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Saisissez le fond de caisse en espèces au démarrage. Les ventes seront
        rattachées à votre session jusqu’à la fin de service.
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          openMutation.mutate();
        }}
      >
        <div>
          <Label htmlFor="fond-ouverture">Fond de caisse (FCFA)</Label>
          <Input
            id="fond-ouverture"
            type="text"
            inputMode="decimal"
            value={fond}
            onChange={(e) => setFond(e.target.value)}
            placeholder="Ex. 50000"
            className="mt-1"
            autoFocus
          />
        </div>
        {openMutation.isError ? (
          <p className="text-sm text-destructive">
            {apiErrorMessage(openMutation.error, "Ouverture impossible")}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={openMutation.isPending || !fond.trim()}
        >
          Commencer le service
        </Button>
      </form>
    </div>
  );
}
