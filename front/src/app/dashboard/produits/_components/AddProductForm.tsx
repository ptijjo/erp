"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { Button } from "~/components/ui/button";
import { isMainOrganization, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { CategoryDto } from "~/lib/api-types";

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

function apiErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data) {
    const data = error.response.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object" && "message" in data) {
      const m = (data as { message?: unknown }).message;
      if (typeof m === "string") return m;
      if (Array.isArray(m)) return m.join(", ");
    }
  }
  return "Impossible de créer le produit";
}

export default function AddProductForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const isMain = me != null && isMainOrganization(me);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["category"] as const,
    queryFn: async () => {
      const { data } = await api.get<CategoryDto[]>("/category");
      return data;
    },
  });

  const categorySelectOptions = categoryOptionsForSelect(categories);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { description: "", offeredToSubsidiaries: false },
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
          ? { offeredToSubsidiaries: Boolean(body.offeredToSubsidiaries) }
          : {}),
      };
      await api.post("/product", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["product"] });
      router.push("/dashboard/produits");
    },
    onError: (err) => {
      setError("root", { message: apiErrorMessage(err) });
    },
  });

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
