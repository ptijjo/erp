"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search } from "lucide-react";

import { useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { VenteListItemDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

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

function venteLabel(v: VenteListItemDto): string {
  return v.numeroTicket != null
    ? `#${String(v.numeroTicket)}`
    : v.id.slice(0, 8).toUpperCase();
}

function statutFacture(status: string): string {
  if (status === "CONFIRMED") return "Validée";
  if (status === "DRAFT") return "Brouillon";
  if (status === "CANCELLED") return "Annulée";
  return status;
}

export default function FacturePage() {
  const { data: me, isPending: mePending } = useMe();
  const orgId = me?.organisationId;
  const [search, setSearch] = useState("");

  const {
    data: ventes = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["vente", "organization", orgId, "factures"] as const,
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
    const list = ventes.filter((v) => v.status === "CONFIRMED");
    if (!q) return list;
    return list.filter((v) => {
      const label = venteLabel(v).toLowerCase();
      const org = v.organization?.name?.toLowerCase() ?? "";
      const email = v.user?.email?.toLowerCase() ?? "";
      return (
        label.includes(q) ||
        org.includes(q) ||
        email.includes(q) ||
        formatFcfa(parseDecimal(v.totalAmount)).toLowerCase().includes(q)
      );
    });
  }, [ventes, search]);

  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-6 overflow-auto bg-[#F3F4F6] p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div
          className="flex size-11 items-center justify-center rounded-xl bg-white shadow-sm"
          style={{ color: ORANGE }}
          aria-hidden
        >
          <FileText className="size-6" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-wide text-[#2D323E]">
            Factures & tickets
          </h1>
          <p className="text-sm text-gray-600">
            Ventes confirmées (tickets de caisse) de votre organisation.
          </p>
        </div>
      </header>

      {(mePending || (!orgId && me)) && (
        <p className="text-sm text-amber-800">
          {mePending
            ? "Chargement…"
            : "Profil sans organisation : impossible de charger les factures."}
        </p>
      )}

      {isError && (
        <p className="text-sm text-red-600">
          Impossible de charger les ventes (vérifiez l’API et vos droits).
        </p>
      )}

      {orgId && (
        <>
          <div className="relative max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (n°, boutique, caissier, montant)…"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-[#2D323E] shadow-sm outline-none focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/25"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 font-semibold text-[#2D323E]">
                      N° / Réf.
                    </th>
                    <th className="px-4 py-3 font-semibold text-[#2D323E]">
                      Date
                    </th>
                    <th className="px-4 py-3 font-semibold text-[#2D323E]">
                      Boutique
                    </th>
                    <th className="px-4 py-3 font-semibold text-[#2D323E]">
                      Caissier
                    </th>
                    <th className="px-4 py-3 font-semibold text-[#2D323E]">
                      Statut
                    </th>
                    <th className="px-4 py-3 font-semibold text-[#2D323E]">
                      Total TTC
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
                        Aucune facture (vente confirmée) pour cette recherche.
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
                        <td className="px-4 py-3 text-gray-700">
                          {v.user?.email ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                            {statutFacture(v.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">
                          {formatFcfa(parseDecimal(v.totalAmount))}
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
