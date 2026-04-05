"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { PermissionDto } from "~/lib/api-types";

import { apiErrorMessage } from "../../produits/_lib/api-error-message";
import { isFullAccessRole } from "../_lib/full-access-roles";

const schema = z.object({
  name: z.string().min(1, { message: "Le nom est requis" }).trim(),
  description: z.string().optional(),
});

type Schema = z.infer<typeof schema>;

export default function AddPermissionForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const canManage =
    me != null && isFullAccessRole(me.role.name);
  const [rootError, setRootError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  const submitMutation = useMutation({
    mutationFn: async (values: Schema) => {
      const payload: { name: string; description?: string } = {
        name: values.name.trim(),
      };
      if (values.description?.trim()) {
        payload.description = values.description.trim();
      }
      const { data } = await api.post<PermissionDto>("/permission", payload);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["permission"] });
      router.push("/dashboard/utilisateurs/permissions");
    },
    onError: (err) => {
      setRootError(
        apiErrorMessage(err, "Impossible de créer la permission"),
      );
    },
  });

  if (mePending) {
    return <p className="text-sm text-gray-600">Chargement du profil…</p>;
  }

  if (me == null) {
    return (
      <div className="max-w-lg rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-800">
        <p className="font-semibold">Session non disponible</p>
        <Link
          href="/"
          className="mt-3 inline-block font-medium text-orange-600 underline-offset-2 hover:underline"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div
        className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
        role="alert"
      >
        <p className="font-semibold">Accès refusé</p>
        <p className="mt-2">
          Seuls l’administrateur, le directeur général et le directeur des
          opérations peuvent créer des permissions.
        </p>
        <Link
          href="/dashboard/utilisateurs/permissions"
          className="mt-4 inline-block font-medium text-orange-700 underline-offset-2 hover:underline"
        >
          Retour au catalogue
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) => {
        setRootError(null);
        submitMutation.mutate(data);
      })}
      className="flex w-full max-w-2xl flex-col gap-8"
    >
      {rootError && (
        <p className="text-sm text-red-600" role="alert">
          {rootError}
        </p>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#2D323E]">
          Nouvelle permission
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Créez d’abord la permission ici ; vous pourrez ensuite l’associer à
          un ou plusieurs rôles depuis la fiche du rôle ou l’écran «
          Permissions » du rôle.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Format conseillé pour les droits effectifs :{" "}
          <span className="font-mono">action:Sujet</span> (ex.{" "}
          <span className="font-mono">read:Vente</span>,{" "}
          <span className="font-mono">manage:Stock</span>).
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label
              htmlFor="perm-name"
              className="mb-1 block text-sm font-medium text-gray-800"
            >
              Nom technique <span className="text-red-500">*</span>
            </label>
            <input
              id="perm-name"
              {...register("name")}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 font-mono text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
              placeholder="ex. read:Stock"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="perm-desc"
              className="mb-1 block text-sm font-medium text-gray-800"
            >
              Description <span className="text-gray-400">(facultatif)</span>
            </label>
            <textarea
              id="perm-desc"
              rows={2}
              {...register("description")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
            />
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={isSubmitting || submitMutation.isPending}
        className="w-fit rounded-lg bg-orange-500 px-6 py-2.5 font-semibold text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting || submitMutation.isPending
          ? "Enregistrement…"
          : "Créer la permission"}
      </button>
    </form>
  );
}
