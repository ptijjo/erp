"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Layers, Pencil, Search } from "lucide-react";

import { api } from "~/lib/api";
import type { StockDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

import { apiErrorMessage } from "../produits/_lib/api-error-message";

const ORANGE = "#FF8C00";

export default function StocksPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<StockDto | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editMin, setEditMin] = useState("");
  const [editMax, setEditMax] = useState("");

  const { data: stocks = [], isLoading, isError } = useQuery({
    queryKey: ["stock"] as const,
    queryFn: async () => {
      const { data } = await api.get<StockDto[]>("/stock");
      return data;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stocks;
    return stocks.filter(
      (s) =>
        s.product.name.toLowerCase().includes(q) ||
        s.organization.name.toLowerCase().includes(q) ||
        s.organization.slug.toLowerCase().includes(q),
    );
  }, [stocks, search]);

  const lowStockIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of filtered) {
      if (s.quantity <= s.minQuantity) set.add(s.id);
    }
    return set;
  }, [filtered]);

  const patchMutation = useMutation({
    mutationFn: async ({
      id,
      quantity,
      minQuantity,
      maxQuantity,
    }: {
      id: string;
      quantity: number;
      minQuantity: number;
      maxQuantity: number | null;
    }) => {
      await api.patch(`/stock/${id}`, {
        quantity,
        minQuantity,
        maxQuantity,
      });
    },
    onSuccess: async () => {
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible de mettre à jour le stock"));
    },
  });

  function openEdit(s: StockDto) {
    setEditing(s);
    setEditQuantity(String(s.quantity));
    setEditMin(String(s.minQuantity));
    setEditMax(s.maxQuantity != null ? String(s.maxQuantity) : "");
  }

  function submitEdit() {
    if (!editing) return;
    const q = Number(editQuantity);
    const mn = Number(editMin);
    const mxRaw = editMax.trim();
    const mx = mxRaw === "" ? null : Number(mxRaw);
    if (!Number.isInteger(q) || q < 0) {
      alert("Quantité invalide");
      return;
    }
    if (!Number.isInteger(mn) || mn < 0) {
      alert("Seuil min invalide");
      return;
    }
    if (mx !== null && (!Number.isInteger(mx) || mx < 0)) {
      alert("Seuil max invalide");
      return;
    }
    patchMutation.mutate({
      id: editing.id,
      quantity: q,
      minQuantity: mn,
      maxQuantity: mx,
    });
  }

  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-6 overflow-auto bg-[#F3F4F6] p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div
          className="flex size-11 items-center justify-center rounded-xl bg-white shadow-sm"
          style={{ color: ORANGE }}
          aria-hidden
        >
          <Layers className="size-6" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-wide text-[#2D323E]">
            Stocks
          </h1>
          <p className="text-sm text-gray-600">
            Stocks par organisation et produit. Les lignes en alerte sont sous
            le seuil minimum.
          </p>
        </div>
      </header>

      <div className="relative max-w-xl">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400"
          strokeWidth={1.75}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrer par produit ou organisation…"
          className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-[#2D323E] shadow-sm outline-none focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/25"
        />
      </div>

      {isError && (
        <p className="text-sm text-red-600">Impossible de charger les stocks.</p>
      )}

      {isLoading ? (
        <p className="text-gray-600">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-600">
          {stocks.length === 0
            ? "Aucune ligne de stock."
            : "Aucun résultat pour ce filtre."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Organisation
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Produit
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Prix ref.
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Qté
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Min
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Max
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-[#2D323E]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const alert = lowStockIds.has(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-gray-100 last:border-0 ${
                        alert ? "bg-amber-50/80" : "hover:bg-gray-50/60"
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-800">
                        <span className="flex items-center gap-2">
                          {alert && (
                            <AlertTriangle
                              className="size-4 shrink-0 text-amber-600"
                              aria-label="Sous le seuil"
                            />
                          )}
                          {s.organization.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {s.product.name}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatFcfa(parseDecimal(s.product.price))}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#2D323E]">
                        {s.quantity}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {s.minQuantity}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {s.maxQuantity ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#2D323E] transition-colors hover:bg-gray-50"
                        >
                          <Pencil className="size-3.5" />
                          Modifier
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-edit-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2
              id="stock-edit-title"
              className="text-lg font-bold text-[#2D323E]"
            >
              Ajuster le stock
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {editing.product.name} — {editing.organization.name}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label
                  htmlFor="edit-qty"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Quantité
                </label>
                <input
                  id="edit-qty"
                  type="number"
                  min={0}
                  step={1}
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-min"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Seuil minimum
                </label>
                <input
                  id="edit-min"
                  type="number"
                  min={0}
                  step={1}
                  value={editMin}
                  onChange={(e) => setEditMin(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-max"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Seuil maximum (vide = sans plafond)
                </label>
                <input
                  id="edit-max"
                  type="number"
                  min={0}
                  step={1}
                  value={editMax}
                  onChange={(e) => setEditMax(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                  placeholder="Optionnel"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitEdit}
                disabled={patchMutation.isPending}
                className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: ORANGE }}
              >
                {patchMutation.isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
