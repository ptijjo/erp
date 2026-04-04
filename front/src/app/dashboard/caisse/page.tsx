"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, PlayCircle, StopCircle, Clock } from "lucide-react";

import { useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { SessionCaisseDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

import { apiErrorMessage } from "../produits/_lib/api-error-message";

const ORANGE = "#FF8C00";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statutLabel(s: string): string {
  if (s === "OUVERTE") return "Ouverte";
  if (s === "CLOTUREE") return "Clôturée";
  return s;
}

export default function CaissePage() {
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const orgId = me?.organisationId;
  const userId = me?.sub;

  const [fondOuverture, setFondOuverture] = useState("");
  const [fondCloture, setFondCloture] = useState("");
  const [commentaireCloture, setCommentaireCloture] = useState("");

  const {
    data: sessionOuverte,
    isLoading: openLoading,
    isError: openError,
  } = useQuery({
    queryKey: ["session-caisse", "open", orgId] as const,
    queryFn: async () => {
      const { data } = await api.get<SessionCaisseDto | null>(
        `/session-caisse/open/${orgId}`,
      );
      return data;
    },
    enabled: Boolean(orgId),
  });

  const { data: sessionsHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["session-caisse", "all"] as const,
    queryFn: async () => {
      const { data } = await api.get<SessionCaisseDto[]>("/session-caisse");
      return data;
    },
    enabled: Boolean(orgId),
  });

  const sessionsFiltrees = useMemo(() => {
    if (!orgId) return [];
    return sessionsHistory.filter((s) => s.organizationId === orgId);
  }, [sessionsHistory, orgId]);

  const openMutation = useMutation({
    mutationFn: async () => {
      const n = Number(fondOuverture.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        throw new Error("Fond d’ouverture invalide");
      }
      await api.post("/session-caisse", {
        organizationId: orgId,
        userId,
        fondOuverture: n,
      });
    },
    onSuccess: async () => {
      setFondOuverture("");
      await queryClient.invalidateQueries({
        queryKey: ["session-caisse"] as const,
      });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible d’ouvrir la session"));
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const n = Number(fondCloture.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        throw new Error("Fond de clôture invalide");
      }
      await api.patch(`/session-caisse/${sessionId}`, {
        statut: "CLOTUREE",
        fondCloture: n,
        closedByUserId: userId,
        closedAt: new Date().toISOString(),
        commentaireCloture: commentaireCloture.trim() || null,
      });
    },
    onSuccess: async () => {
      setFondCloture("");
      setCommentaireCloture("");
      await queryClient.invalidateQueries({
        queryKey: ["session-caisse"] as const,
      });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible de clôturer la session"));
    },
  });

  const showOrgHint = Boolean(me) && !orgId;

  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-6 overflow-auto bg-[#F3F4F6] p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div
          className="flex size-11 items-center justify-center rounded-xl bg-white shadow-sm"
          style={{ color: ORANGE }}
          aria-hidden
        >
          <Wallet className="size-6" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-wide text-[#2D323E]">
            Caisse
          </h1>
          <p className="text-sm text-gray-600">
            Session de caisse (ouverture / clôture) pour votre organisation.
          </p>
        </div>
      </header>

      {(mePending || showOrgHint || openError) && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          {mePending && <p>Chargement du profil…</p>}
          {showOrgHint && (
            <p>Profil sans organisation : la caisse n’est pas disponible.</p>
          )}
          {openError && (
            <p>Impossible de charger l’état de la session (droits ou API).</p>
          )}
        </div>
      )}

      {orgId && (
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#2D323E]">
              <PlayCircle className="size-5 text-emerald-600" />
              Session en cours
            </h2>

            {openLoading ? (
              <p className="mt-4 text-gray-500">Chargement…</p>
            ) : sessionOuverte ? (
              <div className="mt-4 space-y-4">
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Ouverte le</dt>
                    <dd className="font-medium text-[#2D323E]">
                      {formatDateTime(sessionOuverte.openedAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Caissier</dt>
                    <dd className="font-medium text-[#2D323E]">
                      {sessionOuverte.user?.email ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Fond d’ouverture</dt>
                    <dd className="font-semibold text-emerald-700">
                      {formatFcfa(parseDecimal(sessionOuverte.fondOuverture))}
                    </dd>
                  </div>
                </dl>

                <div className="border-t border-gray-100 pt-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#2D323E]">
                    <StopCircle className="size-4 text-red-500" />
                    Clôturer la session
                  </h3>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label
                        htmlFor="fond-cloture"
                        className="mb-1 block text-xs font-medium text-gray-600"
                      >
                        Espèces comptées en caisse (FCFA)
                      </label>
                      <input
                        id="fond-cloture"
                        type="number"
                        min={0}
                        step={1}
                        value={fondCloture}
                        onChange={(e) => setFondCloture(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                        placeholder="Ex. 150000"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="comment-cloture"
                        className="mb-1 block text-xs font-medium text-gray-600"
                      >
                        Commentaire (facultatif)
                      </label>
                      <textarea
                        id="comment-cloture"
                        rows={2}
                        value={commentaireCloture}
                        onChange={(e) => setCommentaireCloture(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Écart, incident…"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => closeMutation.mutate(sessionOuverte.id)}
                      disabled={
                        closeMutation.isPending ||
                        fondCloture === "" ||
                        !userId
                      }
                      className="h-10 w-full cursor-pointer rounded-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ backgroundColor: ORANGE }}
                    >
                      {closeMutation.isPending
                        ? "Clôture…"
                        : "Clôturer la session"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <p className="mb-4 text-sm text-gray-600">
                  Aucune session ouverte pour cette organisation. Saisissez le
                  fond de caisse initial pour ouvrir.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor="fond-ouverture"
                      className="mb-1 block text-xs font-medium text-gray-600"
                    >
                      Fond d’ouverture (FCFA)
                    </label>
                    <input
                      id="fond-ouverture"
                      type="number"
                      min={0}
                      step={1}
                      value={fondOuverture}
                      onChange={(e) => setFondOuverture(e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                      placeholder="Ex. 50000"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => openMutation.mutate()}
                    disabled={
                      openMutation.isPending ||
                      fondOuverture === "" ||
                      !userId
                    }
                    className="h-10 shrink-0 cursor-pointer rounded-lg px-6 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ backgroundColor: ORANGE }}
                  >
                    {openMutation.isPending ? "Ouverture…" : "Ouvrir la caisse"}
                  </button>
                </div>
              </div>
            )}
          </article>

          <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#2D323E]">
              <Clock className="size-5 text-sky-600" />
              Historique (votre organisation)
            </h2>
            {historyLoading ? (
              <p className="mt-4 text-gray-500">Chargement…</p>
            ) : sessionsFiltrees.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">
                Aucune session enregistrée.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-3 py-2 font-semibold text-[#2D323E]">
                        Statut
                      </th>
                      <th className="px-3 py-2 font-semibold text-[#2D323E]">
                        Ouverture
                      </th>
                      <th className="px-3 py-2 font-semibold text-[#2D323E]">
                        Clôture
                      </th>
                      <th className="px-3 py-2 font-semibold text-[#2D323E]">
                        Fond ouv.
                      </th>
                      <th className="px-3 py-2 font-semibold text-[#2D323E]">
                        Fond clôt.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionsFiltrees.slice(0, 20).map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-3 py-2">
                          <span
                            className={
                              s.statut === "OUVERTE"
                                ? "text-emerald-700"
                                : "text-gray-700"
                            }
                          >
                            {statutLabel(s.statut)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {formatDateTime(s.openedAt)}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {s.closedAt
                            ? formatDateTime(s.closedAt)
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {formatFcfa(parseDecimal(s.fondOuverture))}
                        </td>
                        <td className="px-3 py-2">
                          {s.fondCloture != null
                            ? formatFcfa(parseDecimal(s.fondCloture))
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      )}
    </main>
  );
}
