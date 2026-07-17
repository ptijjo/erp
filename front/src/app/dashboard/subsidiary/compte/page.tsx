"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ScanLine } from "lucide-react";

import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useMe } from "~/hooks/use-me";
import {
  canOperateCaisse,
  canReadSessionCaisseHistory,
} from "~/lib/dashboard-navigation";
import { api } from "~/lib/api";
import type { SessionCaisseDto, VenteDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

function confirmedVentes(session: SessionCaisseDto): VenteDto[] {
  return session.ventes.filter((v) => v.status === "CONFIRMED");
}

export default function ComptePage() {
  const { data: me } = useMe();
  const canReadSessions = me != null && canReadSessionCaisseHistory(me);
  const canOpenCaisse = me != null && canOperateCaisse(me);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["session-caisse", "mine"] as const,
    queryFn: async () => {
      const { data } = await api.get<SessionCaisseDto[]>("/session-caisse/mine");
      return data;
    },
    enabled: canReadSessions,
  });

  return (
    <PageShell>
      <PageHeader
        title="Mes sessions caisse"
        description="Historique de vos sessions et tickets confirmés par service."
      />

      {!canReadSessions ? (
        <p className="mt-4 text-sm text-muted-foreground">
          L’historique des sessions de caisse n’est pas disponible pour votre
          profil.
        </p>
      ) : isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Chargement…</p>
      ) : !sessions?.length ? (
        <div className="mt-8 rounded-xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune session enregistrée pour le moment.
          </p>
          {canOpenCaisse ? (
            <Button className="mt-4" asChild>
              <Link href="/dashboard/subsidiary/caisse">
                <ScanLine className="mr-2 size-4" />
                Ouvrir la caisse
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {sessions.map((s) => {
            const expanded = expandedId === s.id;
            const tickets = confirmedVentes(s);
            return (
              <div
                key={s.id}
                className="overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30"
                  onClick={() =>
                    setExpandedId(expanded ? null : s.id)
                  }
                >
                  {expanded ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {new Date(s.openedAt).toLocaleString("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.statut === "OUVERTE"
                        ? "Session en cours"
                        : s.closedAt
                          ? `Clôturée le ${new Date(s.closedAt).toLocaleString("fr-FR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}`
                          : "Clôturée"}
                    </p>
                  </div>
                  <Badge
                    variant={s.statut === "OUVERTE" ? "default" : "secondary"}
                  >
                    {s.statut === "OUVERTE" ? "En cours" : "Clôturée"}
                  </Badge>
                  <div className="hidden text-right text-sm sm:block">
                    <p className="font-mono tabular-nums">
                      {s.nombreVentes != null
                        ? `${s.nombreVentes} vente(s)`
                        : `${tickets.length} vente(s)`}
                    </p>
                    <p className="text-muted-foreground">
                      {formatFcfa(parseDecimal(s.totalVentesFcfa ?? 0))}
                    </p>
                  </div>
                </button>
                {expanded ? (
                  <div className="border-t bg-muted/20 px-4 py-3 text-sm">
                    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Fond d’ouverture
                        </dt>
                        <dd className="font-mono tabular-nums">
                          {formatFcfa(parseDecimal(s.fondOuverture))}
                        </dd>
                      </div>
                      {s.fondCloture != null ? (
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            Fond de clôture
                          </dt>
                          <dd className="font-mono tabular-nums">
                            {formatFcfa(parseDecimal(s.fondCloture))}
                          </dd>
                        </div>
                      ) : null}
                      {s.ecartCloture != null ? (
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            Écart espèces
                          </dt>
                          <dd
                            className={`font-mono tabular-nums ${
                              parseDecimal(s.ecartCloture) === 0
                                ? ""
                                : parseDecimal(s.ecartCloture) > 0
                                  ? "text-amber-700"
                                  : "text-destructive"
                            }`}
                          >
                            {formatFcfa(parseDecimal(s.ecartCloture))}
                          </dd>
                        </div>
                      ) : null}
                      {s.commentaireCloture ? (
                        <div className="sm:col-span-2 lg:col-span-4">
                          <dt className="text-xs text-muted-foreground">
                            Commentaire clôture
                          </dt>
                          <dd>{s.commentaireCloture}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {tickets.length > 0 ? (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Tickets confirmés
                        </p>
                        <ul className="divide-y rounded-lg border bg-card">
                          {tickets.map((v) => (
                            <li
                              key={v.id}
                              className="flex items-center justify-between gap-4 px-3 py-2"
                            >
                              <span>
                                {v.numeroTicket != null
                                  ? `Ticket n°${v.numeroTicket}`
                                  : "Vente confirmée"}
                              </span>
                              <span className="font-mono tabular-nums">
                                {formatFcfa(parseDecimal(v.totalAmount))}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-3 text-muted-foreground">
                        Aucun ticket confirmé sur cette session.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
