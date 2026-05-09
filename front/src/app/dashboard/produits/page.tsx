"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  ArrowUpDown,
  ListFilter,
  SquarePlus,
  Trash2,
} from "lucide-react";

import { hasMePermission, isMainOrganization, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { CategoryDto, ProductDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

import { apiErrorMessage } from "./_lib/api-error-message";
import {
  categoryOptionsForSelect,
  getParentId,
  normalizeCategories,
} from "./_lib/category-labels";

type ProductSortBy = "name" | "price" | "category";
type SortOrder = "asc" | "desc";

export default function ProduitsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const isMain = me != null && isMainOrganization(me);
  const canCreateProduct =
    me != null && hasMePermission(me, "create", "Product");
  const canUpdateProduct =
    me != null && hasMePermission(me, "update", "Product");
  const canDeleteProduct =
    me != null && hasMePermission(me, "delete", "Product");

  const [showProductFilters, setShowProductFilters] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [productSortBy, setProductSortBy] = useState<ProductSortBy>("name");
  const [productSortOrder, setProductSortOrder] = useState<SortOrder>("asc");

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
  const normalizedCategories = useMemo(
    () => normalizeCategories(categories),
    [categories],
  );
  const categoryDescendants = useMemo(() => {
    const childrenByParent = new Map<string, string[]>();
    for (const category of normalizedCategories) {
      const parentId = getParentId(category);
      if (!parentId) continue;
      const existing = childrenByParent.get(parentId) ?? [];
      existing.push(category.id);
      childrenByParent.set(parentId, existing);
    }
    return childrenByParent;
  }, [normalizedCategories]);

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
      const allowedCategoryIds = new Set<string>([productCategoryId]);
      const queue = [productCategoryId];
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;
        const children = categoryDescendants.get(current) ?? [];
        for (const childId of children) {
          if (allowedCategoryIds.has(childId)) continue;
          allowedCategoryIds.add(childId);
          queue.push(childId);
        }
      }
      list = list.filter((p) => allowedCategoryIds.has(p.categoryId));
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      const result =
        productSortBy === "price"
          ? parseDecimal(a.price) - parseDecimal(b.price)
          : productSortBy === "category"
            ? a.category.name.localeCompare(b.category.name, "fr")
            : a.name.localeCompare(b.name, "fr");
      return productSortOrder === "asc" ? result : -result;
    });
    return sorted;
  }, [
    products,
    productSearch,
    productCategoryId,
    productSortBy,
    productSortOrder,
    categoryDescendants,
  ]);

  function toggleProductSort(column: ProductSortBy) {
    if (productSortBy === column) {
      setProductSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setProductSortBy(column);
    setProductSortOrder("asc");
  }

  function ProductSortIcon({ column }: { column: ProductSortBy }) {
    if (productSortBy !== column) {
      return <ArrowUpDown className="size-3.5 text-gray-400" />;
    }
    return productSortOrder === "asc" ? (
      <ArrowUp className="size-3.5 text-orange-600" />
    ) : (
      <ArrowDown className="size-3.5 text-orange-600" />
    );
  }

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/product/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["product"] });
    },
  });

  function goToProduct(id: string) {
    if (!canUpdateProduct) return;
    router.push(`/dashboard/produits/${id}`);
  }

  function handleDeleteProduct(
    e: MouseEvent<HTMLButtonElement>,
    id: string,
    name: string,
  ) {
    if (!canDeleteProduct) return;
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
          {isMain && canCreateProduct ? (
            <Link
              href="/dashboard/produits/add"
              className="flex w-fit cursor-pointer items-center gap-2 rounded-md bg-gray-100 p-4 transition-all duration-300 hover:bg-gray-200"
            >
              <SquarePlus className="size-4" />
              Ajouter un produit
            </Link>
          ) : null}
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
                <th className="px-4 py-3 font-semibold text-gray-900">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 text-left hover:text-orange-600"
                    onClick={() => toggleProductSort("name")}
                    aria-label="Trier par nom"
                  >
                    Nom
                    <ProductSortIcon column="name" />
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold text-gray-900">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 text-left hover:text-orange-600"
                    onClick={() => toggleProductSort("category")}
                    aria-label="Trier par catégorie"
                  >
                    Catégorie
                    <ProductSortIcon column="category" />
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold text-gray-900">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 text-left hover:text-orange-600"
                    onClick={() => toggleProductSort("price")}
                    aria-label="Trier par prix"
                  >
                    Prix
                    <ProductSortIcon column="price" />
                  </button>
                </th>
                {isMain ? (
                  <th className="px-4 py-3 font-semibold text-gray-900">
                    Filiales
                  </th>
                ) : null}
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
                  className={`border-b border-gray-100 transition-colors ${
                    canUpdateProduct
                      ? "cursor-pointer hover:bg-gray-50/80"
                      : "cursor-default"
                  }`}
                  onClick={() => goToProduct(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goToProduct(p.id);
                    }
                  }}
                  tabIndex={canUpdateProduct ? 0 : -1}
                  role={canUpdateProduct ? "link" : undefined}
                  aria-label={
                    canUpdateProduct ? `Modifier le produit ${p.name}` : undefined
                  }
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{p.category.name}</td>
                  <td className="px-4 py-3 text-gray-800">
                    {formatFcfa(parseDecimal(p.price))}
                  </td>
                  {isMain ? (
                    <td className="px-4 py-3 text-gray-700">
                      {p.offeredToSubsidiaries ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Oui
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Non
                        </span>
                      )}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {p.qrCode}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isMain && canDeleteProduct ? (
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
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
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
