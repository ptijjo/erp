"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { PoleDto } from "~/lib/api-types";

import { apiErrorMessage } from "~/lib/api-error-message";

const schema = z.object({
  code: z
    .string()
    .min(1, { message: "Le code est requis (ex. Pole_INNOVATION)" })
    .max(80)
    .trim(),
  name: z
    .string()
    .min(1, { message: "Le nom du pôle est requis" })
    .max(255)
    .trim(),
  description: z.string().max(2000).optional(),
});

type Schema = z.infer<typeof schema>;

export default function AddPoleForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const canCreatePole = me != null && hasMePermission(me, "create", "Pole");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { description: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (body: Schema) => {
      const payload = {
        code: body.code.trim(),
        name: body.name.trim(),
        ...(body.description?.trim()
          ? { description: body.description.trim() }
          : {}),
      };
      const { data } = await api.post<PoleDto>("/poles", payload);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["poles"] });
      router.push("/dashboard/organisations");
    },
    onError: (err) => {
      setError("root", {
        message: apiErrorMessage(err, "Impossible de créer le pôle"),
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

  if (!canCreatePole) {
    return (
      <div className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950">
        <p className="font-semibold">Accès refusé</p>
        <p className="mt-2">
          Vous n’avez pas la permission de créer des pôles.
        </p>
      </div>
    );
  }

  return (
    <form
      className="flex w-full max-w-lg flex-col gap-5"
      onSubmit={handleSubmit((values) => createMutation.mutate(values))}
    >
      {errors.root?.message ? (
        <p className="rounded-lg border border-red-200 bg-red-50/90 p-3 text-sm text-red-900">
          {errors.root.message}
        </p>
      ) : null}

      <div>
        <label className="block text-sm font-medium text-gray-800" htmlFor="pole-code">
          Code unique
        </label>
        <input
          id="pole-code"
          type="text"
          autoComplete="off"
          className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 font-mono text-sm"
          placeholder="Ex. Pole_RECHERCHE"
          {...register("code")}
        />
        {errors.code?.message ? (
          <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">
            Identifiant stable pour le rattachement des rôles (unique en base).
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800" htmlFor="pole-name">
          Nom affiché
        </label>
        <input
          id="pole-name"
          type="text"
          className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm"
          placeholder="Ex. Pôle recherche & innovation"
          {...register("name")}
        />
        {errors.name?.message ? (
          <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
        ) : null}
      </div>

      <div>
        <label
          className="block text-sm font-medium text-gray-800"
          htmlFor="pole-description"
        >
          Description (optionnel)
        </label>
        <textarea
          id="pole-description"
          rows={3}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          {...register("description")}
        />
        {errors.description?.message ? (
          <p className="mt-1 text-xs text-red-600">
            {errors.description.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || createMutation.isPending}
        className="h-11 rounded-lg bg-orange-500 font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
      >
        {createMutation.isPending ? "Création…" : "Créer le pôle"}
      </button>
    </form>
  );
}
