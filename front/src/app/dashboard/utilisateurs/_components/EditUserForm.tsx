"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  useMe,
  hasMePermission,
  isMainOrganization,
  meQueryKey,
} from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { OrganizationDto, PoleDto, RoleDto, UserDetailDto } from "~/lib/api-types";

import { apiErrorMessage } from "~/lib/api-error-message";
import {
  isMainOrganizationDto,
  rolesForOrganization,
} from "../_lib/user-form-roles";
import {
  optionalUserNameField,
  profilePhotoUrlField,
} from "../_lib/user-form-schema";

const passwordSchema = z
  .string()
  .min(9, { message: "Au moins 9 caractères" })
  .regex(/[a-z]/, { message: "Au moins une minuscule" })
  .regex(/[A-Z]/, { message: "Au moins une majuscule" })
  .regex(/[0-9]/, { message: "Au moins un chiffre" })
  .regex(/[^a-zA-Z0-9]/, { message: "Au moins un symbole" });

function buildSchema(organisations: OrganizationDto[]) {
  return z
    .object({
      firstName: optionalUserNameField,
      lastName: optionalUserNameField,
      profilePhotoUrl: profilePhotoUrlField,
      organizationId: z.string().uuid({ message: "Choisissez une organisation" }),
      poleId: z.string().optional(),
      roleId: z.string().uuid({ message: "Choisissez un rôle" }),
      password: z.string(),
    })
    .superRefine((data, ctx) => {
      const org = organisations.find((o) => o.id === data.organizationId);
      if (isMainOrganizationDto(org) && !data.poleId) {
        ctx.addIssue({
          code: "custom",
          message: "Choisissez un pôle pour la maison mère (VIFAA)",
          path: ["poleId"],
        });
      }
    })
    .refine(
      (data) =>
        data.password.trim() === "" ||
        passwordSchema.safeParse(data.password).success,
      {
        message: "Mot de passe invalide (voir la politique ci-dessous)",
        path: ["password"],
      },
    );
}

type Schema = z.infer<ReturnType<typeof buildSchema>>;

type Props = {
  userId: string;
};

export default function EditUserForm({ userId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const canUpdateUser = me != null && hasMePermission(me, "update", "User");
  const canReadPole = me != null && hasMePermission(me, "read", "Pole");

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

  const { data: poles = [], isLoading: polesLoading } = useQuery({
    queryKey: ["poles"] as const,
    queryFn: async () => {
      const { data } = await api.get<PoleDto[]>("/poles");
      return data;
    },
    enabled: canReadPole && me != null && isMainOrganization(me),
  });

  const orgsSorted = useMemo(
    () =>
      [...organisations].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [organisations],
  );

  const canChangeOrg = me != null && isMainOrganization(me);
  const isAdminTarget = user?.role.name === "ADMIN";

  const schema = useMemo(() => buildSchema(organisations), [organisations]);

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
      firstName: "",
      lastName: "",
      profilePhotoUrl: "",
      organizationId: "",
      poleId: "",
      roleId: "",
      password: "",
    },
  });

  const organizationId = useWatch({ control, name: "organizationId" });
  const poleId = useWatch({ control, name: "poleId" });

  const selectedOrg = useMemo(
    () => organisations.find((o) => o.id === organizationId),
    [organisations, organizationId],
  );

  const isMainOrg = isMainOrganizationDto(selectedOrg);

  const roleOptions = useMemo(
    () =>
      rolesForOrganization(roles, organizationId, selectedOrg, poleId || undefined),
    [roles, organizationId, selectedOrg, poleId],
  );

  useEffect(() => {
    if (!user) return;
    reset({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      profilePhotoUrl: user.profilePhotoUrl?.trim() ?? "",
      organizationId: user.organizationId,
      poleId: user.role.pole?.id ?? "",
      roleId: user.roleId,
      password: "",
    });
  }, [user, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: Schema) => {
      if (!user) return;
      const payload: {
        firstName?: string;
        lastName?: string;
        profilePhotoUrl?: string | null;
        organizationId?: string;
        roleId?: string;
        password?: string;
      } = {};

      const first = data.firstName?.trim() ?? "";
      const last = data.lastName?.trim() ?? "";
      if (first !== (user.firstName?.trim() ?? "")) {
        payload.firstName = first;
      }
      if (last !== (user.lastName?.trim() ?? "")) {
        payload.lastName = last;
      }
      const photo = data.profilePhotoUrl.trim();
      const prevPhoto = user.profilePhotoUrl?.trim() ?? "";
      if (photo !== prevPhoto) {
        payload.profilePhotoUrl = photo === "" ? null : photo;
      }
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
      if (me?.sub === userId) {
        await queryClient.invalidateQueries({ queryKey: meQueryKey });
      }
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

  if (me == null) {
    return (
      <div className="max-w-lg rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-800">
        <p className="font-semibold">Session non disponible</p>
      </div>
    );
  }

  if (!canUpdateUser) {
    return (
      <div
        className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
        role="alert"
      >
        <p className="font-semibold">Accès refusé</p>
        <p className="mt-2">
          Vous n’avez pas la permission de modifier les utilisateurs.
        </p>
      </div>
    );
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

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="edit-user-first-name"
            className="mb-1 block text-sm font-medium text-gray-800"
          >
            Prénom
          </label>
          <input
            id="edit-user-first-name"
            type="text"
            autoComplete="given-name"
            {...register("firstName")}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
            aria-invalid={!!errors.firstName}
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="edit-user-last-name"
            className="mb-1 block text-sm font-medium text-gray-800"
          >
            Nom
          </label>
          <input
            id="edit-user-last-name"
            type="text"
            autoComplete="family-name"
            {...register("lastName")}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
            aria-invalid={!!errors.lastName}
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="edit-user-photo-url"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Photo de profil (URL)
        </label>
        <input
          id="edit-user-photo-url"
          type="url"
          inputMode="url"
          placeholder="https://…"
          {...register("profilePhotoUrl")}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
          aria-invalid={!!errors.profilePhotoUrl}
        />
        <p className="mt-1 text-xs text-gray-500">
          Laissez vide pour afficher les initiales. L’URL doit être accessible
          publiquement (https).
        </p>
        {errors.profilePhotoUrl && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.profilePhotoUrl.message}
          </p>
        )}
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
              if (!isAdminTarget) {
                setValue("poleId", "");
                setValue("roleId", "");
              }
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

      {isMainOrg && !isAdminTarget ? (
        <div>
          <label
            htmlFor="edit-user-pole"
            className="mb-1 block text-sm font-medium text-gray-800"
          >
            Pôle <span className="text-red-500">*</span>
          </label>
          <select
            id="edit-user-pole"
            {...register("poleId", {
              onChange: () => setValue("roleId", ""),
            })}
            disabled={polesLoading || !canReadPole}
            className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 disabled:opacity-60"
            aria-invalid={!!errors.poleId}
          >
            <option value="">— Choisir un pôle —</option>
            {poles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.poleId && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.poleId.message}
            </p>
          )}
          {!canReadPole ? (
            <p className="mt-1 text-xs text-amber-800">
              Vous n’avez pas la permission de consulter les pôles.
            </p>
          ) : null}
        </div>
      ) : null}

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
                rolesLoading ||
                !organizationId ||
                roleOptions.length === 0 ||
                (isMainOrg && !poleId)
              }
              className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 disabled:opacity-60"
              aria-invalid={!!errors.roleId}
            >
              <option value="">
                {!organizationId
                  ? "— Choisissez d’abord une organisation —"
                  : isMainOrg && !poleId
                    ? "— Choisissez d’abord un pôle —"
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
            rolesLoading ||
            (isMainOrg && polesLoading)
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
