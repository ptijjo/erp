"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";

import { apiErrorMessage } from "~/lib/api-error-message";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const schema = z.object({
  name: z
    .string()
    .min(1, { message: "Le nom est requis" })
    .max(255, { message: "Le nom ne doit pas dépasser 255 caractères" })
    .trim(),

  slug: z
    .string()
    .min(1, { message: "Le slug est requis" })
    .max(255, { message: "Le slug ne doit pas dépasser 255 caractères" })
    .trim(),

  description: z.string().max(2000).optional(),
});

type Schema = z.infer<typeof schema>;

export default function AddOrganisationForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const canCreateOrganization =
    me != null && hasMePermission(me, "create", "Organization");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { description: "" },
  });

  const nameValue = watch("name");

  useEffect(() => {
    setValue("slug", slugify(nameValue ?? ""), { shouldValidate: true });
  }, [nameValue, setValue]);

  const createMutation = useMutation({
    mutationFn: async (body: Schema) => {
      const payload = {
        name: body.name.trim(),
        slug: body.slug.trim(),
        ...(body.description?.trim()
          ? { description: body.description.trim() }
          : {}),
      };
      await api.post("/organisation", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organisation"] });
      router.push("/dashboard/hq/organisations");
    },
    onError: (err) => {
      setError("root", {
        message: apiErrorMessage(err, "Impossible de créer l’organisation"),
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

  if (!canCreateOrganization) {
    return (
      <div
        className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
        role="alert"
      >
        <p className="font-semibold">Accès refusé</p>
        <p className="mt-2">
          Vous n’avez pas la permission de créer des organisations.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) => createMutation.mutate(data))}
      className="flex w-full max-w-lg flex-col gap-5"
    >
      <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
        Création réservée aux <strong>filiales (boutiques)</strong>. La maison
        mère existe déjà et ne peut pas être dupliquée.
      </p>

      {errors.root && (
        <p className="text-sm text-red-600" role="alert">
          {errors.root.message}
        </p>
      )}

      <div>
        <label
          htmlFor="org-name"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Nom de la filiale <span className="text-red-500">*</span>
        </label>
        <input
          id="org-name"
          {...register("name")}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
          aria-invalid={!!errors.name}
          autoComplete="organization"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="org-slug"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Slug <span className="text-red-500">*</span>
        </label>
        <input
          id="org-slug"
          {...register("slug")}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 font-mono text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
          aria-invalid={!!errors.slug}
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-gray-500">
          Identifiant URL unique ; généré depuis le nom, modifiable avant
          envoi.
        </p>
        {errors.slug && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.slug.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="org-description"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Description <span className="text-gray-400">(facultatif)</span>
        </label>
        <textarea
          id="org-description"
          {...register("description")}
          rows={4}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
          aria-invalid={!!errors.description}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || createMutation.isPending}
        className="w-fit rounded-lg bg-orange-500 px-5 py-2.5 font-semibold text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting || createMutation.isPending
          ? "Création…"
          : "Créer la filiale"}
      </button>
    </form>
  );
}
