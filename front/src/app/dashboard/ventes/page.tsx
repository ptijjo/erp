"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Eye,
  Package,
  Plus,
  Search,
  Store,
  Trash2,
  TrendingUp,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type {
  OrganizationDto,
  ProductDto,
  VenteListItemDto,
} from "~/lib/api-types";
import { cn } from "~/lib/utils";

import { venteToSaleRow, type SaleRow } from "./_lib/map-vente";
import {
  getPeriodBounds,
  type SalePeriod,
} from "./_lib/period-bounds";

const ALL_BOUTIQUES = "__ALL__" as const;

/** Boutiques réelles : les filiales vendent ; la maison mère (`MAIN`) ne figure pas dans le filtre. */
const ORG_TYPE_SUBSIDIARY = "SUBSIDIARY" as const;

const PERIOD_TABS: { id: SalePeriod; label: string }[] = [
  { id: "hour", label: "HEURE" },
  { id: "day", label: "JOUR" },
  { id: "week", label: "SEMAINE" },
  { id: "month", label: "MOIS" },
  { id: "year", label: "AN" },
];

const ORANGE = "#FF8C00";

function formatFcfa(value: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} FCFA`;
}

function formatSaleDateTime(d: Date): string {
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VentesPage() {
  const { data: me, isPending: mePending } = useMe();
  const orgId = me?.organisationId;

  const [boutiqueFilter, setBoutiqueFilter] = useState<
    string | typeof ALL_BOUTIQUES | null
  >(null);
  const [productFilterId, setProductFilterId] = useState("");

  const {
    data: organisations = [],
    isLoading: organisationsLoading,
    isError: organisationsError,
  } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto[]>("/organisation");
      return data;
    },
    enabled: Boolean(orgId),
  });

  useEffect(() => {
    if (!orgId || boutiqueFilter !== null || organisations.length === 0) return;
    const myOrg = organisations.find((o) => o.id === orgId);
    if (myOrg?.organizationType === "MAIN") {
      setBoutiqueFilter(ALL_BOUTIQUES);
    } else {
      setBoutiqueFilter(orgId);
    }
  }, [orgId, boutiqueFilter, organisations]);

  const boutiqueOrgsSorted = useMemo(
    () =>
      [...organisations]
        .filter((o) => o.organizationType === ORG_TYPE_SUBSIDIARY)
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [organisations],
  );

  const ventesByOrgQueries = useQueries({
    queries: boutiqueOrgsSorted.map((org) => ({
      queryKey: ["vente", "organization", org.id] as const,
      queryFn: async () => {
        const { data } = await api.get<VenteListItemDto[]>(
          `/vente/organization/${org.id}`,
        );
        return data;
      },
      enabled:
        Boolean(orgId) &&
        boutiqueFilter === ALL_BOUTIQUES &&
        boutiqueOrgsSorted.length > 0,
    })),
  });

  const ventesSingleOrgQuery = useQuery({
    queryKey: ["vente", "organization", boutiqueFilter] as const,
    queryFn: async () => {
      const { data } = await api.get<VenteListItemDto[]>(
        `/vente/organization/${boutiqueFilter as string}`,
      );
      return data;
    },
    enabled:
      Boolean(orgId) &&
      Boolean(boutiqueFilter) &&
      boutiqueFilter !== ALL_BOUTIQUES,
  });

  const ventesRaw = useMemo(() => {
    if (boutiqueFilter === null) return [];
    if (boutiqueFilter === ALL_BOUTIQUES) {
      const merged = ventesByOrgQueries.flatMap((q) => q.data ?? []);
      const byId = new Map(merged.map((v) => [v.id, v]));
      return [...byId.values()].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return ventesSingleOrgQuery.data ?? [];
  }, [boutiqueFilter, ventesByOrgQueries, ventesSingleOrgQuery.data]);

  const ventesLoading =
    boutiqueFilter === null ||
    organisationsLoading ||
    (boutiqueFilter === ALL_BOUTIQUES
      ? ventesByOrgQueries.some((q) => q.isPending)
      : ventesSingleOrgQuery.isPending);

  const ventesError =
    organisationsError ||
    (boutiqueFilter === ALL_BOUTIQUES
      ? ventesByOrgQueries.some((q) => q.isError)
      : ventesSingleOrgQuery.isError);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["product"] as const,
    queryFn: async () => {
      const { data } = await api.get<ProductDto[]>("/product");
      return data;
    },
    enabled: Boolean(orgId),
  });

  const sales: SaleRow[] = useMemo(
    () => ventesRaw.map(venteToSaleRow),
    [ventesRaw],
  );

  const productOptions = useMemo(
    () =>
      [...products].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [products],
  );

  const [period, setPeriod] = useState<SalePeriod>("hour");
  const [search, setSearch] = useState("");
  const [periodReference] = useState(() => new Date());

  const filteredByPeriod = useMemo(() => {
    const { start, end } = getPeriodBounds(period, periodReference);
    return sales.filter((s) => s.soldAt >= start && s.soldAt <= end);
  }, [period, periodReference, sales]);

  const filteredByProduct = useMemo(() => {
    if (!productFilterId) return filteredByPeriod;
    return filteredByPeriod.filter((s) =>
      s.productIds.includes(productFilterId),
    );
  }, [filteredByPeriod, productFilterId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filteredByProduct;
    return filteredByProduct.filter(
      (s) =>
        s.saleNumber.toLowerCase().includes(q) ||
        s.clientName.toLowerCase().includes(q) ||
        s.paymentMode.toLowerCase().includes(q) ||
        s.organizationName.toLowerCase().includes(q),
    );
  }, [filteredByProduct, search]);

  const totalPeriod = useMemo(
    () => filtered.reduce((acc, s) => acc + s.totalFcfa, 0),
    [filtered],
  );
  const count = filtered.length;
  const average = count > 0 ? Math.round(totalPeriod / count) : 0;

  const showAuthHint = !mePending && me === null;
  const showOrgHint = Boolean(me) && !orgId;

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-auto bg-[#F3F4F6] p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-[#2D323E] transition-colors hover:bg-white"
            aria-label="Retour au tableau de bord"
          >
            <ArrowLeft className="size-6" strokeWidth={1.75} />
          </Link>
          <h1 className="text-2xl font-bold tracking-wide text-[#2D323E]">
            VENTES
          </h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <nav
            className="flex flex-wrap gap-1 rounded-lg bg-white/80 p-1 shadow-sm"
            aria-label="Période"
          >
            {PERIOD_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriod(id)}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-2 text-xs font-semibold transition-colors sm:text-sm",
                  period === id
                    ? "text-white shadow-sm"
                    : "text-[#2D323E]/70 hover:bg-gray-100",
                )}
                style={
                  period === id
                    ? { backgroundColor: ORANGE }
                    : undefined
                }
              >
                {label}
              </button>
            ))}
          </nav>

          <Button
            type="button"
            className="h-11 shrink-0 cursor-pointer rounded-lg border-0 px-5 font-semibold text-white shadow-md hover:opacity-95"
            style={{ backgroundColor: ORANGE }}
          >
            <Plus className="size-5" strokeWidth={2} />
            Nouvelle vente
          </Button>
        </div>
      </header>

      {(showAuthHint || showOrgHint || ventesError) && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          {showAuthHint && (
            <p>Session expirée ou non connecté — reconnectez-vous.</p>
          )}
          {showOrgHint && (
            <p>Profil sans organisation : impossible de charger les ventes.</p>
          )}
          {ventesError && (
            <p>
              Impossible de charger les ventes (vérifiez l’API et vos droits).
            </p>
          )}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div
            className="flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"
            aria-hidden
          >
            <TrendingUp className="size-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-500">Total période</p>
            <p className="truncate text-lg font-bold text-[#2D323E]">
              {formatFcfa(totalPeriod)}
            </p>
          </div>
        </article>

        <article className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div
            className="flex size-12 items-center justify-center rounded-full bg-sky-500/15 text-sky-600"
            aria-hidden
          >
            <DollarSign className="size-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-500">
              Nombre de ventes
            </p>
            <p className="text-lg font-bold text-[#2D323E]">{count}</p>
          </div>
        </article>

        <article className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div
            className="flex size-12 items-center justify-center rounded-full bg-violet-500/15 text-violet-600"
            aria-hidden
          >
            <Calendar className="size-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-500">Moyenne/vente</p>
            <p className="truncate text-lg font-bold text-[#2D323E]">
              {formatFcfa(average)}
            </p>
          </div>
        </article>
      </section>

      <section
        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
        aria-label="Filtres"
      >
        <div className="min-w-[200px] flex-1">
          <label
            htmlFor="vente-filter-boutique"
            className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600"
          >
            <Store className="size-3.5 shrink-0" strokeWidth={2} />
            Boutique
          </label>
          <select
            id="vente-filter-boutique"
            value={boutiqueFilter ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setBoutiqueFilter(v === ALL_BOUTIQUES ? ALL_BOUTIQUES : v);
              setProductFilterId("");
            }}
            disabled={!orgId || boutiqueFilter === null || organisationsLoading}
            className="h-11 w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2D323E] outline-none ring-[#FF8C00]/25 focus:border-[#FF8C00] focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="" hidden>
              Chargement…
            </option>
            <option value={ALL_BOUTIQUES}>Toutes les boutiques</option>
            {boutiqueOrgsSorted.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label
            htmlFor="vente-filter-product"
            className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600"
          >
            <Package className="size-3.5 shrink-0" strokeWidth={2} />
            Produit
          </label>
          <select
            id="vente-filter-product"
            value={productFilterId}
            onChange={(e) => setProductFilterId(e.target.value)}
            disabled={!orgId || productsLoading}
            className="h-11 w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#2D323E] outline-none ring-[#FF8C00]/25 focus:border-[#FF8C00] focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Tous les produits</option>
            {productOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="relative min-w-[200px] flex-2">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400"
            strokeWidth={1.75}
          />
          <input
            id="vente-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (n°, client, paiement, boutique)…"
            className="h-11 w-full cursor-pointer rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm text-[#2D323E] shadow-sm outline-none ring-[#FF8C00]/30 placeholder:text-gray-400 focus:border-[#FF8C00] focus:ring-2"
          />
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="px-4 py-3 font-semibold text-[#2D323E]">
                  N° Vente
                </th>
                <th className="px-4 py-3 font-semibold text-[#2D323E]">
                  Boutique
                </th>
                <th className="px-4 py-3 font-semibold text-[#2D323E]">
                  Client
                </th>
                <th className="px-4 py-3 font-semibold text-[#2D323E]">
                  Date/Heure
                </th>
                <th className="px-4 py-3 font-semibold text-[#2D323E]">
                  Mode paiement
                </th>
                <th className="px-4 py-3 font-semibold text-[#2D323E]">
                  Total
                </th>
                <th className="px-4 py-3 text-right font-semibold text-[#2D323E]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {mePending || (orgId && ventesLoading) ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    Chargement des ventes…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    Aucune vente pour cette période ou ce filtre.
                  </td>
                </tr>
              ) : (
                filtered.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60"
                  >
                    <td className="px-4 py-3 font-medium text-[#2D323E]">
                      {sale.saleNumber}
                    </td>
                    <td className="px-4 py-3 text-[#2D323E]">
                      <span className="line-clamp-2 text-sm">
                        {sale.organizationName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#2D323E]">
                      {sale.clientName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatSaleDateTime(sale.soldAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-700">
                        {sale.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">
                      {formatFcfa(sale.totalFcfa)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#2D323E]"
                          aria-label={`Voir la vente ${sale.saleNumber}`}
                        >
                          <Eye className="size-4" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50"
                          aria-label={`Supprimer la vente ${sale.saleNumber}`}
                        >
                          <Trash2 className="size-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
