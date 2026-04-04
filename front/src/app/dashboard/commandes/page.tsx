"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ShoppingCart, Search } from "lucide-react";

import { useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { VenteListItemDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

const ORANGE = "#FF8C00";

type TabId = "DRAFT" | "CONFIRMED" | "ALL";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function venteLabel(v: VenteListItemDto): string {
  return v.numeroTicket != null
    ? `#${String(v.numeroTicket)}`
    : v.id.slice(0, 8).toUpperCase();
}

function statutCommande(status: string): string {
  if (status === "CONFIRMED") return "Validée";
  if (status === "DRAFT") return "Brouillon";
  if (status === "CANCELLED") return "Annulée";
  return status;
}

function badgeClass(status: string): string {
  if (status === "CONFIRMED")
    return "bg-emerald-500/15 text-emerald-800";
  if (status === "DRAFT")
    return "bg-amber-500/15 text-amber-900";
  if (status === "CANCELLED") return "bg-red-500/15 text-red-800";
  return "bg-gray-100 text-gray-800";
}

export default function CommandesPage() {
  const { data: me, isPending: mePending } = useMe();
  const orgId = me?.organisationId;
  const [tab, setTab] = useState<TabId>("DRAFT");
  const [search, setSearch] = useState("");

  const {
    data: ventes = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["vente", "organization", orgId, "commandes"] as const,
    queryFn: async () => {
      const { data } = await api.get<VenteListItemDto[]>(
        `/vente/organization/${orgId}`,
      );
      return data;
    },
    enabled: Boolean(orgId),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list =
      tab === "ALL"
        ? ventes
        : ventes.filter((v) => v.status === tab);
    if (q) {
      list = list.filter((v) => {
        const label = venteLabel(v).toLowerCase();
        const org = v.organization?.name?.toLowerCase() ?? "";
        return label.includes(q) || org.includes(q);
      });
    }
    return [...list].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [ventes, tab, search]);

  const counts = useMemo(() => {
    return {
      draft: ventes.filter((v) => v.status === "DRAFT").length,
      confirmed: ventes.filter((v) => v.status === "CONFIRMED").length,
      all: ventes.length,
    };
  }, [ventes]);

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "DRAFT", label: "Brouillons", count: counts.draft },
    { id: "CONFIRMED", label: "Validées", count: counts.confirmed },
    { id: "ALL", label: "Toutes", count: counts.all },
  ];

  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-6 overflow-auto bg-[#F3F4F6] p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-xl bg-white shadow-sm"
            style={{ color: ORANGE }}
            aria-hidden
          >
            <ShoppingCart className="size-6" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wide text-[#2D323E]">
              Commandes
            </h1>
            <p className="text-sm text-gray-600">
              Ventes en cours et historique (même flux que la caisse — pas de
              module commande séparé en API).
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/ventes"
          className="text-sm font-semibold text-orange-600 underline-offset-2 hover:underline"
        >
          Voir toutes les ventes →
        </Link>
      </header>

      {(mePending || (!orgId && me)) && (
        <p className="text-sm text-amber-800">
          {mePending
            ? "Chargement…"
            : "Profil sans organisation : impossible de charger les commandes."}
        </p>
      )}

      {isError && (
        <p className="text-sm text-red-600">
          Impossible de charger les données.
        </p>
      )}

      {orgId && (
        <>
          <nav
            className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm"
            aria-label="Filtre statut"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === t.id
                    ? "text-white shadow-sm"
                    : "text-[#2D323E]/70 hover:bg-gray-100"
                }`}
                style={
                  tab === t.id ? { backgroundColor: ORANGE } : undefined
                }
              >
                {t.label}
                <span className="ml-1.5 tabular-nums opacity-90">
                  ({t.count})
                </span>
              </button>
            ))}
          </nav>

          <div className="relative max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par n° ou boutique…"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-[#2D323E] shadow-sm outline-none focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/25"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 font-semibold text-[#2D323E]">
                      Réf.
                    </th>
                    <th className="px-4 py-3 font-semibold text-[#2D323E]">
                      Date
                    </th>
                    <th className="px-4 py-3 font-semibold text-[#2D323E]">
                      Boutique
                    </th>
                    <th className="px-4 py-3 font-semibold text-[#2D323E]">
                      Statut
                    </th>
                    <th className="px-4 py-3 font-semibold text-[#2D323E]">
                      Total
                    </th>
                    <th className="px-4 py-3 font-semibold text-[#2D323E]">
                      Lignes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-gray-500"
                      >
                        Chargement…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-gray-500"
                      >
                        Aucune commande pour ce filtre.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((v) => (
                      <tr
                        key={v.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60"
                      >
                        <td className="px-4 py-3 font-medium text-[#2D323E]">
                          {venteLabel(v)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatDateTime(v.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-[#2D323E]">
                          {v.organization?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass(v.status)}`}
                          >
                            {statutCommande(v.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#2D323E]">
                          {formatFcfa(parseDecimal(v.totalAmount))}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {v.lignes?.length ?? 0}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
