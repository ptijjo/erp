"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "~/components/ui/button";
import { api } from "~/lib/api";
import type { CategoryDto } from "~/lib/api-types";

import { apiErrorMessage } from "../_lib/api-error-message";
import { categoryOptionsForSelect } from "../_lib/category-labels";

const ROOT = "__ROOT__" as const;

const schema = z.object({
  name: z.string().min(1, { message: "Le nom est requis" }),
  description: z.string().optional(),
  parentId: z.union([
    z.literal(ROOT),
    z.string().uuid({ message: "Catégorie parente invalide" }),
  ]),
});

type Schema = z.infer<typeof schema>;

type Props = { categoryId: string };

export default function EditCategoryForm({ categoryId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: category,
    isLoading: categoryLoading,
    isError: categoryError,
  } = useQuery({
    queryKey: ["category", categoryId] as const,
    queryFn: async () => {
      const { data } = await api.get<CategoryDto>(`/category/${categoryId}`);
      return data;
    },
    enabled: Boolean(categoryId),
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["category"] as const,
    queryFn: async () => {
      const { data } = await api.get<CategoryDto[]>("/category");
      return data;
    },
  });

  const parentCandidates = categories.filter((c) => c.id !== categoryId);
  const parentOptions = categoryOptionsForSelect(parentCandidates);

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setError } =
    form;

  useEffect(() => {
    if (!category) return;
    reset({
      name: category.name,
      description: category.description ?? "",
      parentId: category.parentId ?? ROOT,
    });
  }, [category, reset]);

  const updateMutation = useMutation({
    mutationFn: async (body: Schema) => {
      await api.patch(`/category/${categoryId}`, {
        name: body.name.trim(),
        description: body.description?.trim() ?? "",
        parentId: body.parentId === ROOT ? null : body.parentId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["category"] });
      router.push("/dashboard/categories");
    },
    onError: (err) => {
      setError("root", {
        message: apiErrorMessage(err, "Impossible d’enregistrer la catégorie"),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/category/${categoryId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["category"] });
      router.push("/dashboard/categories");
    },
    onError: (err) => {
      setError("root", {
        message: apiErrorMessage(
          err,
          "Impossible de supprimer (sous-catégories ou produits liés ?)",
        ),
      });
    },
  });

  function handleDelete() {
    if (
      !window.confirm(
        "Supprimer cette catégorie ? Les produits ou sous-catégories liés peuvent empêcher la suppression.",
      )
    ) {
      return;
    }
    deleteMutation.mutate();
  }

  if (categoryLoading) {
    return <p className="text-gray-600">Chargement de la catégorie…</p>;
  }

  if (categoryError || !category) {
    return (
      <p className="text-red-600">
        Catégorie introuvable ou accès refusé.
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <form
        onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
        className="flex flex-col gap-5"
      >
        <div>
          <label
            htmlFor="edit-category-name"
            className="mb-1 block text-sm font-medium text-gray-800"
          >
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            id="edit-category-name"
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
            htmlFor="edit-category-description"
            className="mb-1 block text-sm font-medium text-gray-800"
          >
            Description
          </label>
          <textarea
            id="edit-category-description"
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-orange-500/30 focus:border-orange-500 focus:ring-2"
            {...register("description")}
          />
        </div>

        <div>
          <label
            htmlFor="edit-category-parent"
            className="mb-1 block text-sm font-medium text-gray-800"
          >
            Catégorie parente
          </label>
          <select
            id="edit-category-parent"
            className="h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none ring-orange-500/30 focus:border-orange-500 focus:ring-2"
            aria-invalid={!!errors.parentId}
            disabled={categoriesLoading}
            {...register("parentId")}
          >
            <option value={ROOT}>— Catégorie racine —</option>
            {parentOptions.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          {errors.parentId && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.parentId.message}
            </p>
          )}
        </div>

        {errors.root && (
          <p className="text-sm text-red-600" role="alert">
            {errors.root.message}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              updateMutation.isPending ||
              deleteMutation.isPending
            }
            className="h-11 w-full max-w-xs cursor-pointer rounded-lg bg-orange-500 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 sm:w-auto"
          >
            {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending || updateMutation.isPending}
            className="inline-flex h-11 w-full max-w-xs cursor-pointer items-center justify-center rounded-lg border-2 border-red-700 bg-red-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {deleteMutation.isPending
              ? "Suppression…"
              : "Supprimer la catégorie"}
          </button>
        </div>
      </form>
    </div>
  );
}
