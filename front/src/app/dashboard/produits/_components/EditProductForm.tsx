"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "~/components/ui/button";
import { isMainOrganization, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { CategoryDto, ProductDto } from "~/lib/api-types";
import { parseDecimal } from "~/lib/parse-decimal";

import { apiErrorMessage } from "../_lib/api-error-message";
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
});

type Schema = z.infer<typeof schema>;

type Props = { productId: string };

export default function EditProductForm({ productId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const isMain = me != null && isMainOrganization(me);
  const readOnly = !isMain;

  const {
    data: product,
    isLoading: productLoading,
    isError: productError,
  } = useQuery({
    queryKey: ["product", productId] as const,
    queryFn: async () => {
      const { data } = await api.get<ProductDto>(`/product/${productId}`);
      return data;
    },
    enabled: Boolean(productId),
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["category"] as const,
    queryFn: async () => {
      const { data } = await api.get<CategoryDto[]>("/category");
      return data;
    },
  });

  const categorySelectOptions = categoryOptionsForSelect(categories);

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setError } =
    form;

  useEffect(() => {
    if (!product) return;
    reset({
      name: product.name,
      description: product.description ?? "",
      price: parseDecimal(product.price),
      categoryId: product.categoryId,
      offeredToSubsidiaries: product.offeredToSubsidiaries ?? false,
    });
  }, [product, reset]);

  const updateMutation = useMutation({
    mutationFn: async (body: Schema) => {
      await api.patch(`/product/${productId}`, {
        name: body.name.trim(),
        description: body.description?.trim() ?? "",
        price: body.price,
        categoryId: body.categoryId,
        ...(isMain
          ? { offeredToSubsidiaries: Boolean(body.offeredToSubsidiaries) }
          : {}),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["product"] });
      router.push("/dashboard/produits");
    },
    onError: (err) => {
      setError("root", {
        message: apiErrorMessage(err, "Impossible d’enregistrer le produit"),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/product/${productId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["product"] });
      router.push("/dashboard/produits");
    },
    onError: (err) => {
      setError("root", {
        message: apiErrorMessage(err, "Impossible de supprimer le produit"),
      });
    },
  });

  function handleDelete() {
    if (
      !window.confirm(
        "Supprimer ce produit ? Cette action est irréversible.",
      )
    ) {
      return;
    }
    deleteMutation.mutate();
  }

  if (productLoading) {
    return <p className="text-gray-600">Chargement du produit…</p>;
  }

  if (productError || !product) {
    return (
      <p className="text-red-600">
        Produit introuvable ou accès refusé.
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      {readOnly ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Catalogue en lecture seule : seule la maison mère peut modifier ou
          supprimer les produits.
        </p>
      ) : null}
      <form
        onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
        className="flex flex-col gap-5"
      >
        <div>
          <label
            htmlFor="edit-product-name"
            className="mb-1 block text-sm font-medium text-gray-800"
          >
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-product-name"
            type="text"
            autoComplete="off"
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none ring-orange-500/30 focus:border-orange-500 focus:ring-2 disabled:bg-gray-100"
            aria-invalid={!!errors.name}
            disabled={readOnly}
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
            htmlFor="edit-product-description"
            className="mb-1 block text-sm font-medium text-gray-800"
          >
            Description
          </label>
          <textarea
            id="edit-product-description"
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-orange-500/30 focus:border-orange-500 focus:ring-2 disabled:bg-gray-100"
            disabled={readOnly}
            {...register("description")}
          />
        </div>

        <div>
          <label
            htmlFor="edit-product-price"
            className="mb-1 block text-sm font-medium text-gray-800"
          >
            Prix (FCFA) <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-product-price"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none ring-orange-500/30 focus:border-orange-500 focus:ring-2 disabled:bg-gray-100"
            aria-invalid={!!errors.price}
            disabled={readOnly}
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
            htmlFor="edit-product-category"
            className="mb-1 block text-sm font-medium text-gray-800"
          >
            Catégorie <span className="text-red-500">*</span>
          </label>
          <select
            id="edit-product-category"
            className="h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none ring-orange-500/30 focus:border-orange-500 focus:ring-2 disabled:bg-gray-100"
            aria-invalid={!!errors.categoryId}
            disabled={
              readOnly || categoriesLoading || categories.length === 0
            }
            {...register("categoryId")}
          >
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
        </div>

        {isMain ? (
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
            <input
              id="edit-product-offered-subs"
              type="checkbox"
              className="mt-1 size-4 cursor-pointer rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              {...register("offeredToSubsidiaries")}
            />
            <label
              htmlFor="edit-product-offered-subs"
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

        {errors.root && (
          <p className="text-sm text-red-600" role="alert">
            {errors.root.message}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="submit"
            disabled={
              readOnly ||
              isSubmitting ||
              updateMutation.isPending ||
              deleteMutation.isPending
            }
            className="h-11 cursor-pointer rounded-lg bg-orange-500 px-6 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          {isMain ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending || updateMutation.isPending}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-lg border-2 border-red-700 bg-red-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleteMutation.isPending
                ? "Suppression…"
                : "Supprimer le produit"}
            </button>
          ) : null}
        </div>
      </form>

      <p className="font-mono text-xs text-gray-500">QR : {product.qrCode}</p>
    </div>
  );
}
