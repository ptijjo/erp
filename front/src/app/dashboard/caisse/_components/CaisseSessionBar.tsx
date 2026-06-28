"use client";

import Link from "next/link";
import { History, LogOut } from "lucide-react";

import { Button } from "~/components/ui/button";
import type { SessionCaisseCurrentDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

type Props = {
  session: SessionCaisseCurrentDto;
  onCloseClick: () => void;
  canClose?: boolean;
};

export function CaisseSessionBar({ session, onCloseClick, canClose = true }: Props) {
  const { live } = session;
  const fond = parseDecimal(session.fondOuverture);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">Service en cours</p>
          <p className="text-xs text-muted-foreground">
            Ouvert le{" "}
            {new Date(session.openedAt).toLocaleString("fr-FR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/compte">
              <History className="mr-1 size-4" />
              Mes sessions
            </Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={onCloseClick} disabled={!canClose}>
            <LogOut className="mr-1 size-4" />
            Fin de service
          </Button>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Fond d’ouverture</dt>
          <dd className="font-semibold tabular-nums">{formatFcfa(fond)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Ventes confirmées</dt>
          <dd className="font-semibold tabular-nums">
            {live.nombreVentes} · {formatFcfa(live.totalVentesFcfa)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Dont espèces</dt>
          <dd className="font-semibold tabular-nums">
            {formatFcfa(live.totalEspecesFcfa)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Caisse espèces théorique</dt>
          <dd className="font-semibold tabular-nums">
            {formatFcfa(live.theoriqueCaisseEspecesFcfa)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
