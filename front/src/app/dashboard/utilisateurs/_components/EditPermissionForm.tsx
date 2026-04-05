"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "~/lib/api";
import type { PermissionDto } from "~/lib/api-types";

import { apiErrorMessage } from "../../produits/_lib/api-error-message";

const schema = z.object({
  name: z.string().min(1, { message: "Le nom est requis" }).trim(),
  description: z.string().optional(),
});

type Schema = z.infer<typeof schema>;

type Props = {
  permissionId: string;
};

export default function EditPermissionForm({ permissionId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rootError, setRootError] = useState<string | null>(null);

  const { data: perm, isLoading, isError } = useQuery({
    queryKey: ["permission", permissionId] as const,
    queryFn: async () => {
      const { data } = await api.get<PermissionDto>(`/permission/${permissionId}`);
      return data;
    },
    enabled: Boolean(permissionId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (perm) {
      reset({
        name: perm.name,
        description: perm.description ?? "",
      });
    }
  }, [perm, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: Schema) => {
      const payload: { name: string; description?: string } = {
        name: values.name.trim(),
      };
      if (values.description?.trim()) {
        payload.description = values.description.trim();
      } else {
        payload.description = "";
      }
      const { data } = await api.patch<PermissionDto>(
        `/permission/${permissionId}`,
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["permission"] });
      router.push("/dashboard/utilisateurs/permissions");
    },
    onError: (err) => {
      setRootError(
        apiErrorMessage(err, "Impossible d’enregistrer la permission"),
      );
    },
  });

  if (isLoading) {
    return <p className="text-sm text-gray-600">Chargement…</p>;
  }

  if (isError || !perm) {
    return (
      <p className="text-sm text-red-600" role="alert">
        Permission introuvable ou accès refusé.
      </p>
    );
  }

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
        <h2 className="text-lg font-semibold text-[#2D323E]">
          Modifier la permission
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Format conseillé pour les droits effectifs :{" "}
          <span className="font-mono">action:Sujet</span> (ex.{" "}
          <span className="font-mono">read:Vente</span>).
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label
              htmlFor="edit-perm-name"
              className="mb-1 block text-sm font-medium text-gray-800"
            >
              Nom technique <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-perm-name"
              {...register("name")}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 font-mono text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="edit-perm-desc"
              className="mb-1 block text-sm font-medium text-gray-800"
            >
              Description <span className="text-gray-400">(facultatif)</span>
            </label>
            <textarea
              id="edit-perm-desc"
              rows={2}
              {...register("description")}
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
