"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "~/lib/api";
import type { StockDto } from "~/lib/api-types";

export default function StocksPage() {
  const { data: stocks = [], isLoading, isError } = useQuery({
    queryKey: ["stock"] as const,
    queryFn: async () => {
      const { data } = await api.get<StockDto[]>("/stock");
      return data;
    },
  });

  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-white p-6">
      <h1 className="text-4xl font-extrabold text-orange-500">Stocks</h1>
      <p className="mt-2 text-sm text-gray-600">
        {isLoading
          ? "Chargement…"
          : `${stocks.length} ligne${stocks.length !== 1 ? "s" : ""} (selon vos droits API).`}
      </p>

      {isError && (
        <p className="mt-4 text-red-600">Impossible de charger les stocks.</p>
      )}

      {isLoading ? (
        <p className="mt-8 text-gray-600">Chargement…</p>
      ) : stocks.length === 0 ? (
        <p className="mt-8 text-gray-600">Aucune ligne de stock.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-semibold text-gray-900">
                  Organisation
                </th>
                <th className="px-4 py-3 font-semibold text-gray-900">Produit</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Quantité</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Min</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Max</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-gray-100 hover:bg-gray-50/80"
                >
                  <td className="px-4 py-3 text-gray-800">
                    {s.organization.name}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {s.product.name}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{s.quantity}</td>
                  <td className="px-4 py-3 text-gray-600">{s.minQuantity}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.maxQuantity ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
