"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { isAxiosError } from "axios";

import { Button } from "~/components/ui/button";
import { api } from "~/lib/api";
import type {
  CategoryDto,
  OrganizationCatalogDto,
  ProductDto,
} from "~/lib/api-types";

import { categoryOptionsForSelect } from "../../produits/_lib/category-labels";

type Props = {
  organizationId: string;
  organizationName: string;
  canEditCatalog: boolean;
};

function saveErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data) {
    const data = error.response.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object" && "message" in data) {
      const m = (data as { message?: unknown }).message;
      if (typeof m === "string") return m;
      if (Array.isArray(m)) return m.join(", ");
    }
  }
  return "Enregistrement impossible.";
}

function catalogSyncKey(catalog: OrganizationCatalogDto): string {
  return `${[...catalog.categoryIds].sort().join(",")}|${[...catalog.productIds].sort().join(",")}`;
}

type SelectionsProps = {
  catalog: OrganizationCatalogDto;
  organizationId: string;
  canEditCatalog: boolean;
  categories: CategoryDto[];
  offeredProducts: ProductDto[];
  onClose: () => void;
};

function OrganisationCatalogSelections({
  catalog,
  organizationId,
  canEditCatalog,
  categories,
  offeredProducts,
  onClose,
}: SelectionsProps) {
  const queryClient = useQueryClient();
  const [catSel, setCatSel] = useState(
    () => new Set(catalog.categoryIds),
  );
  const [prodSel, setProdSel] = useState(
    () => new Set(catalog.productIds),
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put<OrganizationCatalogDto>(
        `/organisation/${organizationId}/catalog`,
        {
          categoryIds: [...catSel],
          productIds: [...prodSel],
        },
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organisation", organizationId, "catalog"],
      });
    },
  });

  function toggleCat(id: string) {
    setCatSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleProd(id: string) {
    setProdSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="mt-6 space-y-6 border-t border-orange-200 pt-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          Catégories
        </h3>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
          {categoryOptionsForSelect(categories).map(({ id, label }) => (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={catSel.has(id)}
                onChange={() => toggleCat(id)}
                disabled={!canEditCatalog}
                className="size-4 rounded border-gray-300 text-orange-600"
              />
              <span className="text-sm text-gray-800">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          Produits additionnels
        </h3>
        <p className="mb-2 text-xs text-gray-500">
          En complément des produits déjà couverts par les catégories
          sélectionnées.
        </p>
        <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
          {offeredProducts.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucun produit « proposé aux filiales ». Activez l’option sur les
              fiches produits (maison mère).
            </p>
          ) : (
            offeredProducts.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-0.5 rounded px-2 py-1.5 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={prodSel.has(p.id)}
                  onChange={() => toggleProd(p.id)}
                  disabled={!canEditCatalog}
                  className="size-4 rounded border-gray-300 text-orange-600"
                />
                <span className="text-sm text-gray-800">{p.name}</span>
                <span className="text-xs text-gray-400">
                  ({p.category.name})
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      {saveMutation.isError ? (
        <p className="text-sm text-red-600" role="alert">
          {saveErrorMessage(saveMutation.error)}
        </p>
      ) : null}

      {saveMutation.isSuccess ? (
        <p className="text-sm text-emerald-700" role="status">
          Catalogue enregistré.
        </p>
      ) : null}

      {!canEditCatalog ? (
        <p className="text-sm text-gray-600">
          Mode lecture seule : vous n’avez pas la permission de modifier ce
          catalogue.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {canEditCatalog ? (
          <Button
            type="button"
            className="bg-orange-500 text-white hover:bg-orange-600"
            disabled={saveMutation.isPending}
            onClick={() => {
              saveMutation.reset();
              saveMutation.mutate();
            }}
          >
            {saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        ) : null}
        <button
          type="button"
          className="text-sm text-gray-600 underline-offset-2 hover:underline"
          onClick={() => {
            saveMutation.reset();
            onClose();
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

export default function OrganisationCatalogPanel({
  organizationId,
  organizationName,
  canEditCatalog,
}: Props) {
  const [open, setOpen] = useState(false);

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ["organisation", organizationId, "catalog"] as const,
    queryFn: async () => {
      const { data } = await api.get<OrganizationCatalogDto>(
        `/organisation/${organizationId}/catalog`,
      );
      return data;
    },
    enabled: open,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["category"] as const,
    queryFn: async () => {
      const { data } = await api.get<CategoryDto[]>("/category");
      return data;
    },
    enabled: open,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["product"] as const,
    queryFn: async () => {
      const { data } = await api.get<ProductDto[]>("/product");
      return data;
    },
    enabled: open,
  });

  const offeredProducts = useMemo(
    () => products.filter((p) => p.offeredToSubsidiaries),
    [products],
  );

  return (
    <div className="mt-8 max-w-3xl rounded-xl border border-orange-200 bg-orange-50/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Catalogue produits — {organizationName}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Les catégories cochées incluent tout leur sous-arbre. Les produits
            additionnels doivent être marqués « proposés aux filiales » sur
            leur fiche.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-orange-300 bg-white text-orange-900 hover:bg-orange-50"
          onClick={() => {
            setOpen((o) => !o);
          }}
        >
          {open
            ? "Fermer"
            : canEditCatalog
              ? "Gérer catégories & produits"
              : "Voir catégories & produits"}
        </Button>
      </div>

      {open ? (
        <>
          {catalogLoading && !catalog ? (
            <p className="mt-6 text-sm text-gray-600">
              Chargement du catalogue…
            </p>
          ) : null}
          {catalog ? (
            <OrganisationCatalogSelections
              key={catalogSyncKey(catalog)}
              catalog={catalog}
              organizationId={organizationId}
              canEditCatalog={canEditCatalog}
              categories={categories}
              offeredProducts={offeredProducts}
              onClose={() => setOpen(false)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
