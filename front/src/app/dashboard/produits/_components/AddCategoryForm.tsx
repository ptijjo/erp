"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "~/components/ui/button";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import { fetchCategories } from "~/lib/api-list";
import { apiErrorMessage } from "~/lib/api-error-message";
import type { CategoryDto } from "~/lib/api-types";

import { categoryOptionsForSelect } from "../_lib/category-labels";

const schema = z.object({
  name: z.string().min(1, { message: "Le nom est requis" }),
  description: z.string().optional(),
  parentId: z.union([
    z.literal(""),
    z.string().uuid({ message: "Catégorie parente invalide" }),
  ]),
});

type Schema = z.infer<typeof schema>;

export default function AddCategoryForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const canCreateCategory =
    me != null && hasMePermission(me, "create", "Category");

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["category"] as const,
    queryFn: fetchCategories,
  });

  const parentOptions = categoryOptionsForSelect(categories);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", parentId: "" },
  });

  const parentId = watch("parentId");

  const createMutation = useMutation({
    mutationFn: async (body: Schema) => {
      const payload: {
        name: string;
        description?: string;
        parentId?: string;
      } = {
        name: body.name.trim(),
      };
      if (body.description?.trim()) {
        payload.description = body.description.trim();
      }
      if (body.parentId && body.parentId !== "") {
        payload.parentId = body.parentId;
      }
      await api.post("/category", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["category"] });
      router.push("/dashboard/hq/categories");
    },
    onError: (err) => {
      setError("root", {
        message: apiErrorMessage(err, "Impossible de créer la catégorie"),
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

  if (!canCreateCategory) {
    return (
      <div
        className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
        role="alert"
      >
        <p className="font-semibold">Accès refusé</p>
        <p className="mt-2">
          Vous n’avez pas la permission de créer des catégories.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) => createMutation.mutate(data))}
      className="flex w-full max-w-lg flex-col gap-5"
    >
      <p className="text-sm text-gray-600">
        Laissez « Catégorie racine » pour une catégorie principale ; choisissez un
        parent pour créer une <strong>sous-catégorie</strong>.
      </p>

      <div>
        <label
          htmlFor="category-name"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Nom <span className="text-red-500">*</span>
        </label>
        <input
          id="category-name"
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
          htmlFor="category-description"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Description
        </label>
        <textarea
          id="category-description"
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none ring-orange-500/30 focus:border-orange-500 focus:ring-2"
          {...register("description")}
        />
      </div>

      <div>
        <label
          htmlFor="category-parent"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Catégorie parente (sous-catégorie)
        </label>
        <select
          id="category-parent"
          className="h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none ring-orange-500/30 focus:border-orange-500 focus:ring-2"
          aria-invalid={!!errors.parentId}
          disabled={categoriesLoading}
          {...register("parentId")}
        >
          <option value="">
            {categoriesLoading ? "Chargement…" : "— Catégorie racine —"}
          </option>
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
        {parentId ? (
          <p className="mt-2 text-xs text-gray-500">
            La nouvelle catégorie sera rattachée au parent sélectionné (contrainte
            unique nom + parent côté serveur).
          </p>
        ) : null}
      </div>

      {errors.root && (
        <p className="text-sm text-red-600" role="alert">
          {errors.root.message}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || createMutation.isPending}
        className="h-11 w-full max-w-xs cursor-pointer rounded-lg bg-orange-500 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
      >
        {createMutation.isPending ? "Création…" : "Créer la catégorie"}
      </Button>
    </form>
  );
}
