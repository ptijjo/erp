"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "~/components/ui/button";
import { hasMePermission, isMainOrganization, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import { apiErrorMessage } from "~/lib/api-error-message";
import type { CategoryDto, SupplierDto } from "~/lib/api-types";

import { categoryOptionsForSelect } from "../_lib/category-labels";

const schema = z.object({
  name: z.string().min(1, { message: "Le nom est requis" }),
  description: z.string().optional(),
  price: z
    .number({ error: () => ({ message: "Prix invalide" }) })
    .refine((n) => Number.isFinite(n) && n > 0, {
      message: "Le prix doit être un nombre positif",
    }),
  categoryId: z.string().uuid({ message: "Choisissez une catégorie" }),
  offeredToSubsidiaries: z.boolean().optional(),
  supplierIds: z.array(z.string().uuid()).optional(),
});

type Schema = z.infer<typeof schema>;

export default function AddProductForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const isMain = me != null && isMainOrganization(me);
  const canCreateProduct =
    me != null && hasMePermission(me, "create", "Product");
  const canReadSuppliers =
    me != null && hasMePermission(me, "read", "Supplier");

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["category"] as const,
    queryFn: async () => {
      const { data } = await api.get<CategoryDto[]>("/category");
      return data;
    },
  });

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ["supplier"] as const,
    queryFn: async () => {
      const { data } = await api.get<SupplierDto[]>("/supplier");
      return data;
    },
    enabled: Boolean(isMain && canReadSuppliers),
  });

  const categorySelectOptions = categoryOptionsForSelect(categories);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: "",
      offeredToSubsidiaries: false,
      supplierIds: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: Schema) => {
      const payload = {
        name: body.name.trim(),
        ...(body.description?.trim()
          ? { description: body.description.trim() }
          : {}),
        price: body.price,
        categoryId: body.categoryId,
        ...(isMain
          ? {
              offeredToSubsidiaries: Boolean(body.offeredToSubsidiaries),
              ...(body.supplierIds?.length
                ? { supplierIds: body.supplierIds }
                : {}),
            }
          : {}),
      };
      await api.post("/product", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["product"] });
      router.push("/dashboard/produits");
    },
    onError: (err) => {
      setError("root", {
        message: apiErrorMessage(err, "Impossible de créer le produit"),
      });
    },
  });

  if (mePending) {
    return <p className="text-sm text-gray-600">Vérification des droits…</p>;
  }

  if (me == null) {
    return (
      <div className="max-w-lg rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-800">
        <p className="font-semibold">Session non disponible</p>
      </div>
    );
  }

  if (!canCreateProduct) {
    return (
      <div
        className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
        role="alert"
      >
        <p className="font-semibold">Accès refusé</p>
        <p className="mt-2">Vous n’avez pas la permission de créer des produits.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) => createMutation.mutate(data))}
      className="flex w-full max-w-lg flex-col gap-5"
    >
      <div>
        <label
          htmlFor="product-name"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Nom <span className="text-red-500">*</span>
        </label>
        <input
          id="product-name"
          type="text"
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none ring-orange-500/30 focus:border-orange-500 focus:ring-2"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="product-description"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Description
        </label>
        <textarea
          id="product-description"
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-orange-500/30 focus:border-orange-500 focus:ring-2"
          {...register("description")}
        />
      </div>

      <div>
        <label
          htmlFor="product-price"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Prix (FCFA) <span className="text-red-500">*</span>
        </label>
        <input
          id="product-price"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none ring-orange-500/30 focus:border-orange-500 focus:ring-2"
          aria-invalid={!!errors.price}
          {...register("price", { valueAsNumber: true })}
        />
        {errors.price && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.price.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="product-category"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Catégorie <span className="text-red-500">*</span>
        </label>
        <select
          id="product-category"
          className="h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none ring-orange-500/30 focus:border-orange-500 focus:ring-2"
          aria-invalid={!!errors.categoryId}
          disabled={categoriesLoading || categories.length === 0}
          {...register("categoryId")}
        >
          <option value="">
            {categoriesLoading
              ? "Chargement…"
              : categories.length === 0
                ? "Aucune catégorie"
                : "— Choisir —"}
          </option>
          {categorySelectOptions.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.categoryId.message}
          </p>
        )}
        {!categoriesLoading && categories.length === 0 ? (
          <p className="mt-2 text-sm text-amber-800">
            Créez d’abord une catégorie depuis le menu « Catégories » ou via le
            seed.
          </p>
        ) : null}
      </div>

      {isMain ? (
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
          <input
            id="product-offered-subs"
            type="checkbox"
            className="mt-1 size-4 cursor-pointer rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            {...register("offeredToSubsidiaries")}
          />
          <label
            htmlFor="product-offered-subs"
            className="cursor-pointer text-sm text-gray-800"
          >
            <span className="font-medium">Proposer aux filiales</span>
            <span className="mt-1 block text-gray-600">
              Les boutiques filiales pourront voir ce produit, le vendre et en
              gérer le stock.
            </span>
          </label>
        </div>
      ) : null}

      {isMain && canReadSuppliers ? (
        <fieldset
          className="rounded-lg border border-gray-200 bg-gray-50/80 p-4"
          disabled={suppliersLoading}
        >
          <legend className="px-1 text-sm font-medium text-gray-800">
            Fournisseurs (commandes filiales)
          </legend>
          <p className="mb-3 text-xs text-gray-600">
            Optionnel : associez dès la création les fournisseurs habilités pour
            ce produit.
          </p>
          <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
            {suppliers.map((sup) => {
              const ids = watch("supplierIds") ?? [];
              const checked = ids.includes(sup.id);
              return (
                <label
                  key={sup.id}
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-800"
                >
                  <input
                    type="checkbox"
                    className="size-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    checked={checked}
                    onChange={(e) => {
                      const cur = getValues("supplierIds") ?? [];
                      if (e.target.checked) {
                        setValue("supplierIds", [...cur, sup.id], {
                          shouldDirty: true,
                        });
                      } else {
                        setValue(
                          "supplierIds",
                          cur.filter((id) => id !== sup.id),
                          { shouldDirty: true },
                        );
                      }
                    }}
                  />
                  <span>{sup.name}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {errors.root && (
        <p className="text-sm text-red-600" role="alert">
          {errors.root.message}
        </p>
      )}

      <Button
        type="submit"
        disabled={
          isSubmitting ||
          createMutation.isPending ||
          categories.length === 0
        }
        className="h-11 w-full max-w-xs cursor-pointer rounded-lg bg-orange-500 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
      >
        {createMutation.isPending ? "Création…" : "Créer le produit"}
      </Button>
    </form>
  );
}
