"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { PoleDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { isSystemPoleCode } from "~/lib/system-poles";

const schema = z.object({
  code: z
    .string()
    .min(1, { message: "Le code est requis" })
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

type Props = {
  poleId: string;
};

export default function EditPoleForm({ poleId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const canUpdate = me != null && hasMePermission(me, "update", "Pole");

  const {
    data: pole,
    isLoading: poleLoading,
    isError: poleError,
  } = useQuery({
    queryKey: ["poles", poleId] as const,
    queryFn: async () => {
      const { data } = await api.get<PoleDto>(`/poles/${poleId}`);
      return data;
    },
    enabled: canUpdate,
  });

  const systemPole = pole != null && isSystemPoleCode(pole.code);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name: "", description: "" },
  });

  useEffect(() => {
    if (!pole) return;
    reset({
      code: pole.code,
      name: pole.name,
      description: pole.description ?? "",
    });
  }, [pole, reset]);

  const updateMutation = useMutation({
    mutationFn: async (body: Schema) => {
      const payload: {
        code?: string;
        name: string;
        description: string | null;
      } = {
        name: body.name.trim(),
        description: body.description?.trim()
          ? body.description.trim()
          : null,
      };
      if (!systemPole) {
        payload.code = body.code.trim();
      }
      const { data } = await api.patch<PoleDto>(`/poles/${poleId}`, payload);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["poles"] });
      router.push("/dashboard/utilisateurs");
    },
    onError: (err) => {
      setError("root", {
        message: apiErrorMessage(err, "Impossible de modifier le pôle"),
      });
    },
  });

  if (mePending || poleLoading) {
    return <p className="text-sm text-gray-600">Chargement…</p>;
  }

  if (me == null) {
    return (
      <div className="max-w-lg rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-800">
        <p className="font-semibold">Session non disponible</p>
      </div>
    );
  }

  if (!canUpdate) {
    return (
      <div className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950">
        <p className="font-semibold">Accès refusé</p>
        <p className="mt-2">
          Vous n’avez pas la permission de modifier des pôles.
        </p>
      </div>
    );
  }

  if (poleError || !pole) {
    return (
      <p className="text-sm text-red-600">Pôle introuvable.</p>
    );
  }

  return (
    <form
      className="flex w-full max-w-lg flex-col gap-5"
      onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
    >
      {errors.root?.message ? (
        <p className="rounded-lg border border-red-200 bg-red-50/90 p-3 text-sm text-red-900">
          {errors.root.message}
        </p>
      ) : null}

      {systemPole ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950">
          Pôle système VIFAA : le code est verrouillé ; vous pouvez modifier le
          nom et la description.
        </p>
      ) : null}

      <div>
        <label
          className="block text-sm font-medium text-gray-800"
          htmlFor="pole-code"
        >
          Code unique
        </label>
        <input
          id="pole-code"
          type="text"
          autoComplete="off"
          disabled={systemPole}
          className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 font-mono text-sm disabled:bg-gray-100 disabled:text-gray-600"
          {...register("code")}
        />
        {errors.code?.message ? (
          <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>
        ) : null}
      </div>

      <div>
        <label
          className="block text-sm font-medium text-gray-800"
          htmlFor="pole-name"
        >
          Nom affiché
        </label>
        <input
          id="pole-name"
          type="text"
          className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm"
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
        disabled={isSubmitting || updateMutation.isPending}
        className="h-11 rounded-lg bg-orange-500 font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
      >
        {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
