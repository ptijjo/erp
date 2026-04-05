"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useMe, isMainOrganization } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { OrganizationDto, RoleDto, UserDetailDto } from "~/lib/api-types";

import { apiErrorMessage } from "../../produits/_lib/api-error-message";

const passwordSchema = z
  .string()
  .min(9, { message: "Au moins 9 caractères" })
  .regex(/[a-z]/, { message: "Au moins une minuscule" })
  .regex(/[A-Z]/, { message: "Au moins une majuscule" })
  .regex(/[0-9]/, { message: "Au moins un chiffre" })
  .regex(/[^a-zA-Z0-9]/, { message: "Au moins un symbole" });

const schema = z
  .object({
    organizationId: z.string().uuid({ message: "Choisissez une organisation" }),
    roleId: z.string().uuid({ message: "Choisissez un rôle" }),
    password: z.string(),
  })
  .refine(
    (data) =>
      data.password.trim() === "" ||
      passwordSchema.safeParse(data.password).success,
    { message: "Mot de passe invalide (voir la politique ci-dessous)", path: ["password"] },
  );

type Schema = z.infer<typeof schema>;

const EXCLUDED_ROLE_NAMES = new Set(["ADMIN"]);

function rolesForOrganization(
  roles: RoleDto[],
  organizationId: string,
): RoleDto[] {
  if (!organizationId) return [];
  return roles.filter(
    (r) =>
      !EXCLUDED_ROLE_NAMES.has(r.name) &&
      (r.organizationScopeId === null ||
        r.organizationScopeId === organizationId),
  );
}

type Props = {
  userId: string;
};

export default function EditUserForm({ userId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();

  const { data: user, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ["user", userId] as const,
    queryFn: async () => {
      const { data } = await api.get<UserDetailDto>(`/user/${userId}`);
      return data;
    },
    enabled: Boolean(userId),
  });

  const { data: organisations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto[]>("/organisation");
      return data;
    },
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["role"] as const,
    queryFn: async () => {
      const { data } = await api.get<RoleDto[]>("/role");
      return data;
    },
  });

  const orgsSorted = useMemo(
    () =>
      [...organisations].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [organisations],
  );

  const canChangeOrg = me != null && isMainOrganization(me);
  const isAdminTarget = user?.role.name === "ADMIN";

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: "",
      roleId: "",
      password: "",
    },
  });

  const organizationId = useWatch({ control, name: "organizationId" });

  const roleOptions = useMemo(
    () => rolesForOrganization(roles, organizationId),
    [roles, organizationId],
  );

  useEffect(() => {
    if (!user) return;
    reset({
      organizationId: user.organizationId,
      roleId: user.roleId,
      password: "",
    });
  }, [user, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: Schema) => {
      if (!user) return;
      const payload: {
        organizationId?: string;
        roleId?: string;
        password?: string;
      } = {};
      if (canChangeOrg && data.organizationId !== user.organizationId) {
        payload.organizationId = data.organizationId;
      }
      if (!isAdminTarget && data.roleId !== user.roleId) {
        payload.roleId = data.roleId;
      }
      const pwd = data.password.trim();
      if (pwd !== "") {
        payload.password = pwd;
      }
      await api.patch(`/user/${userId}`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      router.push(`/dashboard/utilisateurs/${userId}`);
    },
    onError: (err) => {
      setError("root", {
        message: apiErrorMessage(err, "Impossible d’enregistrer les modifications"),
      });
    },
  });

  if (mePending || userLoading) {
    return <p className="text-sm text-gray-600">Chargement…</p>;
  }

  if (userError || !user) {
    return (
      <p className="text-sm text-red-600" role="alert">
        Utilisateur introuvable ou accès refusé.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
      className="flex w-full max-w-lg flex-col gap-5"
    >
      <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
        Laissez le mot de passe vide pour ne pas le modifier. S’il est renseigné,
        il doit respecter la politique de sécurité (9 caractères minimum,
        majuscule, minuscule, chiffre, symbole).
      </p>

      {errors.root && (
        <p className="text-sm text-red-600" role="alert">
          {errors.root.message}
        </p>
      )}

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-800">
          Email
        </span>
        <p className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
          {user.email}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          L’adresse email ne peut pas être modifiée depuis cette interface.
        </p>
      </div>

      <div>
        <label
          htmlFor="edit-user-org"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Organisation <span className="text-red-500">*</span>
        </label>
        <select
          id="edit-user-org"
          {...register("organizationId", {
            onChange: () => {
              if (!isAdminTarget) setValue("roleId", "");
            },
          })}
          disabled={orgsLoading || !canChangeOrg}
          className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          aria-invalid={!!errors.organizationId}
        >
          <option value="">— Choisir —</option>
          {orgsSorted.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        {!canChangeOrg && (
          <p className="mt-1 text-xs text-gray-500">
            Seul un utilisateur de la maison mère peut changer l’organisation.
          </p>
        )}
        {errors.organizationId && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.organizationId.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="edit-user-role"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Rôle <span className="text-red-500">*</span>
        </label>
        {isAdminTarget ? (
          <>
            <p
              id="edit-user-role"
              className="h-10 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm font-medium text-amber-950"
            >
              {user.role.name}
            </p>
            <p className="mt-1 text-xs text-amber-900/90">
              Le rôle ADMIN est réservé au provisionnement ; il ne peut pas être
              modifié via l’API.
            </p>
          </>
        ) : (
          <>
            <select
              id="edit-user-role"
              {...register("roleId")}
              disabled={
                rolesLoading || !organizationId || roleOptions.length === 0
              }
              className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 disabled:opacity-60"
              aria-invalid={!!errors.roleId}
            >
              <option value="">
                {!organizationId
                  ? "— Choisissez d’abord une organisation —"
                  : roleOptions.length === 0
                    ? "— Aucun rôle compatible —"
                    : "— Choisir —"}
              </option>
              {roleOptions.map((r) => (
                <option
                  key={r.id}
                  value={r.id}
                  title={r.description ?? undefined}
                >
                  {r.name}
                </option>
              ))}
            </select>
            {errors.roleId && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.roleId.message}
              </p>
            )}
          </>
        )}
      </div>

      <div>
        <label
          htmlFor="edit-user-password"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Nouveau mot de passe{" "}
          <span className="font-normal text-gray-500">(optionnel)</span>
        </label>
        <input
          id="edit-user-password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={
            isSubmitting ||
            updateMutation.isPending ||
            orgsLoading ||
            rolesLoading
          }
          className="w-fit rounded-lg bg-orange-500 px-5 py-2.5 font-semibold text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting || updateMutation.isPending
            ? "Enregistrement…"
            : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/utilisateurs/${userId}`)}
          className="w-fit rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-800 hover:bg-gray-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
