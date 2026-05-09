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
  FolderTree,
  ListFilter,
  SquarePlus,
  Trash2,
} from "lucide-react";

import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { CategoryDto } from "~/lib/api-types";

import { apiErrorMessage } from "../produits/_lib/api-error-message";
import {
  categoryOptionsForSelect,
  getParentId,
  normalizeCategories,
} from "../produits/_lib/category-labels";

type CategorySortBy = "label" | "type";
type SortOrder = "asc" | "desc";

export default function CategoriesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const canReadCategory = me != null && hasMePermission(me, "read", "Category");
  const canCreateCategory =
    me != null && hasMePermission(me, "create", "Category");
  const canUpdateCategory =
    me != null && hasMePermission(me, "update", "Category");
  const canDeleteCategory =
    me != null && hasMePermission(me, "delete", "Category");

  const [showFilters, setShowFilters] = useState(true);
  const [categorySearch, setCategorySearch] = useState("");
  const [categorySubOfParentId, setCategorySubOfParentId] = useState("");
  const [categorySortBy, setCategorySortBy] = useState<CategorySortBy>("label");
  const [categorySortOrder, setCategorySortOrder] = useState<SortOrder>("asc");

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
      const typeA = categorySubOfParentId ? "Sous-catégorie" : "Racine";
      const typeB = categorySubOfParentId ? "Sous-catégorie" : "Racine";
      const result =
        categorySortBy === "type"
          ? typeA.localeCompare(typeB, "fr")
          : la.localeCompare(lb, "fr");
      return categorySortOrder === "asc" ? result : -result;
    });
    return sorted;
  }, [
    normalizedCategories,
    categoryLabels,
    categorySearch,
    categorySubOfParentId,
    categorySortBy,
    categorySortOrder,
  ]);

  function toggleCategorySort(column: CategorySortBy) {
    if (categorySortBy === column) {
      setCategorySortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setCategorySortBy(column);
    setCategorySortOrder("asc");
  }

  function CategorySortIcon({ column }: { column: CategorySortBy }) {
    if (categorySortBy !== column) {
      return <ArrowUpDown className="size-3.5 text-gray-400" />;
    }
    return categorySortOrder === "asc" ? (
      <ArrowUp className="size-3.5 text-orange-600" />
    ) : (
      <ArrowDown className="size-3.5 text-orange-600" />
    );
  }

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/category/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["category"] });
    },
  });

  function goToCategory(id: string) {
    if (!canUpdateCategory) return;
    router.push(`/dashboard/categories/${id}`);
  }

  function handleDeleteCategory(
    e: MouseEvent<HTMLButtonElement>,
    id: string,
    name: string,
  ) {
    if (!canDeleteCategory) return;
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
          {canCreateCategory && (
            <Link
              href="/dashboard/categories/add"
              className="flex w-fit cursor-pointer items-center gap-2 rounded-md bg-gray-100 p-4 transition-all duration-300 hover:bg-gray-200"
            >
              <SquarePlus className="size-4" />
              Nouvelle catégorie
            </Link>
          )}
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

      {mePending ? (
        <p className="mt-4 text-gray-600">Vérification des droits…</p>
      ) : me == null ? (
        <div className="mt-4 max-w-lg rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-800">
          <p className="font-semibold">Session non disponible</p>
        </div>
      ) : !canReadCategory ? (
        <div
          className="mt-4 max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Accès refusé</p>
          <p className="mt-2">
            Vous n’avez pas la permission de consulter les catégories.
          </p>
        </div>
      ) : null}

      {canReadCategory && categoriesError && (
        <p className="mt-4 text-red-600">
          Impossible de charger les catégories.
        </p>
      )}

      {canReadCategory && !categoriesLoading && categories.length > 0 && (
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
            </div>
          )}
        </div>
      )}

      {!canReadCategory ? null : categoriesLoading ? (
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
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 text-left hover:text-orange-600"
                    onClick={() => toggleCategorySort("label")}
                    aria-label="Trier par libellé"
                  >
                    Libellé
                    <CategorySortIcon column="label" />
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold text-gray-900">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 text-left hover:text-orange-600"
                    onClick={() => toggleCategorySort("type")}
                    aria-label="Trier par type"
                  >
                    Type
                    <CategorySortIcon column="type" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSortedCategories.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-gray-100 transition-colors ${
                    canUpdateCategory
                      ? "cursor-pointer hover:bg-gray-50/80"
                      : "cursor-default"
                  }`}
                  onClick={() => goToCategory(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goToCategory(c.id);
                    }
                  }}
                  tabIndex={canUpdateCategory ? 0 : -1}
                  role={canUpdateCategory ? "link" : undefined}
                  aria-label={
                    canUpdateCategory
                      ? `Modifier la catégorie ${c.name}`
                      : undefined
                  }
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {categoryLabels.get(c.id) ?? c.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {categorySubOfParentId ? "Sous-catégorie" : "Racine"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canDeleteCategory ? (
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
