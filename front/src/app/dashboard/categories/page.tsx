"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownUp,
  FolderTree,
  ListFilter,
  SquarePlus,
  Trash2,
} from "lucide-react";

import { api } from "~/lib/api";
import type { CategoryDto } from "~/lib/api-types";

import { apiErrorMessage } from "../produits/_lib/api-error-message";
import {
  categoryOptionsForSelect,
  getParentId,
  normalizeCategories,
} from "../produits/_lib/category-labels";

type CategorySort = "name-asc" | "name-desc";

export default function CategoriesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showFilters, setShowFilters] = useState(true);
  const [categorySearch, setCategorySearch] = useState("");
  const [categorySubOfParentId, setCategorySubOfParentId] = useState("");
  const [categorySort, setCategorySort] = useState<CategorySort>("name-asc");

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useQuery({
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

  const categoryLabels = useMemo(() => {
    const opts = categoryOptionsForSelect(categories);
    return new Map(opts.map((o) => [o.id, o.label]));
  }, [categories]);

  const categoriesWithChildren = useMemo(
    () =>
      normalizedCategories
        .filter((c) =>
          normalizedCategories.some((x) => getParentId(x) === c.id),
        )
        .sort((a, b) =>
          (categoryLabels.get(a.id) ?? a.name).localeCompare(
            categoryLabels.get(b.id) ?? b.name,
            "fr",
          ),
        ),
    [normalizedCategories, categoryLabels],
  );

  const filteredSortedCategories = useMemo(() => {
    const list =
      categorySubOfParentId === ""
        ? normalizedCategories.filter((c) => getParentId(c) === null)
        : normalizedCategories.filter(
          (c) => getParentId(c) === categorySubOfParentId,
        );

    const q = categorySearch.trim().toLowerCase();
    const searched = q
      ? list.filter((c) => {
        const label = (categoryLabels.get(c.id) ?? c.name).toLowerCase();
        return label.includes(q) || c.name.toLowerCase().includes(q);
      })
      : list;

    const sorted = [...searched];
    sorted.sort((a, b) => {
      const la = categoryLabels.get(a.id) ?? a.name;
      const lb = categoryLabels.get(b.id) ?? b.name;
      return categorySort === "name-desc"
        ? lb.localeCompare(la, "fr")
        : la.localeCompare(lb, "fr");
    });
    return sorted;
  }, [
    normalizedCategories,
    categoryLabels,
    categorySearch,
    categorySubOfParentId,
    categorySort,
  ]);

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/category/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["category"] });
    },
  });

  function goToCategory(id: string) {
    router.push(`/dashboard/categories/${id}`);
  }

  function handleDeleteCategory(
    e: MouseEvent<HTMLButtonElement>,
    id: string,
    name: string,
  ) {
    e.stopPropagation();
    if (!window.confirm(`Supprimer la catégorie « ${name} » ?`)) return;
    deleteCategoryMutation.mutate(id, {
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
            href="/dashboard/categories/add"
            className="flex w-fit cursor-pointer items-center gap-2 rounded-md bg-gray-100 p-4 transition-all duration-300 hover:bg-gray-200"
          >
            <SquarePlus className="size-4" />
            Nouvelle catégorie
          </Link>
        </div>
        <h1 className="flex shrink-0 items-center gap-2 text-4xl font-extrabold text-orange-500">
          <FolderTree className="size-9 shrink-0" strokeWidth={1.75} />
          Catégories
        </h1>
        <div className="hidden flex-1 sm:block" />
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <p className="text-sm text-gray-600">
          {categorySubOfParentId === ""
            ? "Catégories racines. « Sous-catégories de… » ne liste que les parents ayant au moins un enfant (les feuilles n’y figurent pas, la liste reste courte)."
            : `Sous-catégories de « ${categoryLabels.get(categorySubOfParentId) ?? "…"} ».`}
        </p>
      </div>

      {categoriesError && (
        <p className="mt-4 text-red-600">
          Impossible de charger les catégories.
        </p>
      )}

      {!categoriesLoading && categories.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
          >
            <ListFilter className="size-4" aria-hidden />
            <ArrowDownUp className="size-4" aria-hidden />
            Filtres et tri
            <span className="text-xs font-normal text-gray-500">
              {showFilters ? "(masquer)" : "(afficher)"}
            </span>
          </button>

          {showFilters && (
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-[200px] flex-1">
                <label
                  htmlFor="filter-category-search"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Recherche
                </label>
                <input
                  id="filter-category-search"
                  type="search"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="h-10 w-full cursor-text rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                  placeholder="Filtrer…"
                />
              </div>
              <div className="min-w-[260px]">
                <label
                  htmlFor="filter-category-subof"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Sous-catégories de…
                </label>
                <select
                  id="filter-category-subof"
                  value={categorySubOfParentId}
                  onChange={(e) => setCategorySubOfParentId(e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                >
                  <option value="">— Catégories racines —</option>
                  {categoriesWithChildren.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryLabels.get(c.id) ?? c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[180px]">
                <label
                  htmlFor="filter-category-sort"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Tri
                </label>
                <select
                  id="filter-category-sort"
                  value={categorySort}
                  onChange={(e) =>
                    setCategorySort(e.target.value as CategorySort)
                  }
                  className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                >
                  <option value="name-asc">Libellé (A → Z)</option>
                  <option value="name-desc">Libellé (Z → A)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {categoriesLoading ? (
        <p className="mt-8 text-gray-600">Chargement…</p>
      ) : categories.length === 0 ? (
        <p className="mt-8 text-gray-600">Aucune catégorie.</p>
      ) : filteredSortedCategories.length === 0 ? (
        <p className="mt-8 text-gray-600">
          Aucune catégorie ne correspond aux filtres.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-semibold text-gray-900">
                  Libellé
                </th>
                <th className="px-4 py-3 font-semibold text-gray-900">Type</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSortedCategories.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50/80"
                  onClick={() => goToCategory(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goToCategory(c.id);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={`Modifier la catégorie ${c.name}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {categoryLabels.get(c.id) ?? c.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {categorySubOfParentId ? "Sous-catégorie" : "Racine"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      title="Supprimer"
                      disabled={deleteCategoryMutation.isPending}
                      onClick={(e) =>
                        handleDeleteCategory(
                          e,
                          c.id,
                          categoryLabels.get(c.id) ?? c.name,
                        )
                      }
                      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Supprimer ${c.name}`}
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
