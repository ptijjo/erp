"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownUp,
  ListFilter,
  SquarePlus,
  Trash2,
} from "lucide-react";

import { api } from "~/lib/api";
import type { CategoryDto, ProductDto } from "~/lib/api-types";
import { parseDecimal } from "~/lib/parse-decimal";

import { apiErrorMessage } from "./_lib/api-error-message";
import { categoryOptionsForSelect } from "./_lib/category-labels";

type ProductSort =
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "category-asc"
  | "category-desc";

export default function ProduitsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showProductFilters, setShowProductFilters] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [productSort, setProductSort] = useState<ProductSort>("name-asc");

  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ["product"] as const,
    queryFn: async () => {
      const { data } = await api.get<ProductDto[]>("/product");
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["category"] as const,
    queryFn: async () => {
      const { data } = await api.get<CategoryDto[]>("/category");
      return data;
    },
  });

  const filteredSortedProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    let list = products;

    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.name.toLowerCase().includes(q) ||
          p.qrCode.toLowerCase().includes(q),
      );
    }

    if (productCategoryId) {
      list = list.filter((p) => p.categoryId === productCategoryId);
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (productSort) {
        case "name-desc":
          return b.name.localeCompare(a.name, "fr");
        case "price-asc":
          return parseDecimal(a.price) - parseDecimal(b.price);
        case "price-desc":
          return parseDecimal(b.price) - parseDecimal(a.price);
        case "category-asc":
          return a.category.name.localeCompare(b.category.name, "fr");
        case "category-desc":
          return b.category.name.localeCompare(a.category.name, "fr");
        case "name-asc":
        default:
          return a.name.localeCompare(b.name, "fr");
      }
    });
    return sorted;
  }, [products, productSearch, productCategoryId, productSort]);

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/product/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["product"] });
    },
  });

  function goToProduct(id: string) {
    router.push(`/dashboard/produits/${id}`);
  }

  function handleDeleteProduct(
    e: MouseEvent<HTMLButtonElement>,
    id: string,
    name: string,
  ) {
    e.stopPropagation();
    if (!window.confirm(`Supprimer le produit « ${name} » ?`)) return;
    deleteProductMutation.mutate(id, {
      onError: (err) => {
        alert(apiErrorMessage(err, "Suppression impossible"));
      },
    });
  }

  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-white p-6">
      <div className="flex w-full flex-wrap items-center gap-4">
        <div className="flex flex-1 flex-wrap justify-start gap-3">
          <Link
            href="/dashboard/produits/add"
            className="flex w-fit cursor-pointer items-center gap-2 rounded-md bg-gray-100 p-4 transition-all duration-300 hover:bg-gray-200"
          >
            <SquarePlus className="size-4" />
            Ajouter un produit
          </Link>
        </div>
        <h1 className="shrink-0 text-4xl font-extrabold text-orange-500">
          Produits
        </h1>
        <div className="hidden flex-1 sm:block" />
      </div>

      {isError && (
        <p className="mt-4 text-red-600">Impossible de charger les produits.</p>
      )}

      {!isLoading && products.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowProductFilters((v) => !v)}
            className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
          >
            <ListFilter className="size-4" aria-hidden />
            <ArrowDownUp className="size-4" aria-hidden />
            Filtres et tri
            <span className="text-xs font-normal text-gray-500">
              {showProductFilters ? "(masquer)" : "(afficher)"}
            </span>
          </button>

          {showProductFilters && (
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-[200px] flex-1">
                <label
                  htmlFor="filter-product-search"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Recherche (nom, catégorie, QR)
                </label>
                <input
                  id="filter-product-search"
                  type="search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="h-10 w-full cursor-text rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                  placeholder="Filtrer…"
                />
              </div>
              <div className="min-w-[200px]">
                <label
                  htmlFor="filter-product-category"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Filtrer par catégorie
                </label>
                <select
                  id="filter-product-category"
                  value={productCategoryId}
                  onChange={(e) => setProductCategoryId(e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                >
                  <option value="">Toutes les catégories</option>
                  {categoryOptionsForSelect(categories).map(({ id, label }) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[200px]">
                <label
                  htmlFor="filter-product-sort"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Trier par
                </label>
                <select
                  id="filter-product-sort"
                  value={productSort}
                  onChange={(e) =>
                    setProductSort(e.target.value as ProductSort)
                  }
                  className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                >
                  <option value="name-asc">Nom (A → Z)</option>
                  <option value="name-desc">Nom (Z → A)</option>
                  <option value="price-asc">Prix croissant</option>
                  <option value="price-desc">Prix décroissant</option>
                  <option value="category-asc">Catégorie (A → Z)</option>
                  <option value="category-desc">Catégorie (Z → A)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="mt-8 text-gray-600">Chargement…</p>
      ) : products.length === 0 ? (
        <p className="mt-8 text-gray-600">Aucun produit.</p>
      ) : filteredSortedProducts.length === 0 ? (
        <p className="mt-8 text-gray-600">
          Aucun produit ne correspond aux filtres.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-semibold text-gray-900">Nom</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Catégorie</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Prix</th>
                <th className="px-4 py-3 font-semibold text-gray-900">QR</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSortedProducts.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50/80"
                  onClick={() => goToProduct(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goToProduct(p.id);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={`Modifier le produit ${p.name}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{p.category.name}</td>
                  <td className="px-4 py-3 text-gray-800">
                    {new Intl.NumberFormat("fr-FR", {
                      style: "currency",
                      currency: "XOF",
                      maximumFractionDigits: 0,
                    }).format(parseDecimal(p.price))}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {p.qrCode}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      title="Supprimer"
                      disabled={deleteProductMutation.isPending}
                      onClick={(e) => handleDeleteProduct(e, p.id, p.name)}
                      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Supprimer ${p.name}`}
                    >
                      <Trash2 className="size-4" strokeWidth={2} />
                    </button>
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
