"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "~/lib/api";
import type { RoleDto } from "~/lib/api-types";

import { apiErrorMessage } from "../../produits/_lib/api-error-message";
import { isFullAccessRole } from "../_lib/full-access-roles";

const schema = z.object({
  roleName: z.string().min(1, { message: "Le nom du rôle est requis" }).trim(),
  roleDescription: z.string().optional(),
});

type Schema = z.infer<typeof schema>;

type Props = {
  roleId: string;
};

export default function EditRoleForm({ roleId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rootError, setRootError] = useState<string | null>(null);

  const { data: role, isLoading, isError } = useQuery({
    queryKey: ["role", roleId] as const,
    queryFn: async () => {
      const { data } = await api.get<RoleDto>(`/role/${roleId}`);
      return data;
    },
    enabled: Boolean(roleId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { roleName: "", roleDescription: "" },
  });

  useEffect(() => {
    if (role) {
      reset({
        roleName: role.name,
        roleDescription: role.description ?? "",
      });
    }
  }, [role, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: Schema) => {
      const payload: { name: string; description?: string } = {
        name: values.roleName.trim(),
      };
      if (values.roleDescription?.trim()) {
        payload.description = values.roleDescription.trim();
      } else {
        payload.description = "";
      }
      const { data } = await api.patch<RoleDto>(`/role/${roleId}`, payload);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["role"] });
      router.push("/dashboard/utilisateurs/roles");
    },
    onError: (err) => {
      setRootError(apiErrorMessage(err, "Impossible d’enregistrer le rôle"));
    },
  });

  if (isLoading) {
    return <p className="text-sm text-gray-600">Chargement…</p>;
  }

  if (isError || !role) {
    return (
      <p className="text-sm text-red-600" role="alert">
        Rôle introuvable ou accès refusé.
      </p>
    );
  }

  const systemRole = isFullAccessRole(role.name);

  return (
    <form
      onSubmit={handleSubmit((data) => {
        setRootError(null);
        saveMutation.mutate(data);
      })}
      className="flex w-full max-w-2xl flex-col gap-6"
    >
      {rootError && (
        <p className="text-sm text-red-600" role="alert">
          {rootError}
        </p>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#2D323E]">Modifier le rôle</h2>
        <p className="mt-1 text-sm text-gray-600">
          Le nom est normalisé en majuscules côté serveur.
          {systemRole && (
            <span className="mt-2 block text-amber-900">
              Rôle système : le nom ne peut pas être modifié ; vous pouvez
              ajuster la description.
            </span>
          )}
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label
              htmlFor="edit-role-name"
              className="mb-1 block text-sm font-medium text-gray-800"
            >
              Nom du rôle <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-role-name"
              {...register("roleName")}
              disabled={systemRole}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 disabled:cursor-not-allowed disabled:bg-gray-100"
              aria-invalid={!!errors.roleName}
            />
            {errors.roleName && (
              <p className="mt-1 text-sm text-red-600">{errors.roleName.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="edit-role-desc"
              className="mb-1 block text-sm font-medium text-gray-800"
            >
              Description <span className="text-gray-400">(facultatif)</span>
            </label>
            <textarea
              id="edit-role-desc"
              rows={2}
              {...register("roleDescription")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
            />
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={isSubmitting || saveMutation.isPending}
        className="w-fit rounded-lg bg-orange-500 px-6 py-2.5 font-semibold text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting || saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
