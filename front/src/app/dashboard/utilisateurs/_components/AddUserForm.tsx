"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "~/lib/api";
import { fetchOrganizations } from "~/lib/api-list";
import type { OrganizationDto, PoleDto, RoleDto } from "~/lib/api-types";
import { hasMePermission, isMainOrganization, useMe } from "~/hooks/use-me";

import { apiErrorMessage } from "~/lib/api-error-message";
import {
  isMainOrganizationDto,
  rolesForOrganization,
} from "../_lib/user-form-roles";
import { optionalUserNameField } from "../_lib/user-form-schema";

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
      email: z.string().email({ message: "Email invalide" }).trim(),
      firstName: optionalUserNameField,
      lastName: optionalUserNameField,
      password: passwordSchema,
      organizationId: z.string().uuid({ message: "Choisissez une organisation" }),
      poleId: z.string().optional(),
      roleId: z.string().uuid({ message: "Choisissez un rôle" }),
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
    });
}

type Schema = z.infer<ReturnType<typeof buildSchema>>;

export default function AddUserForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const canCreateUser = me != null && hasMePermission(me, "create", "User");
  const canReadPole = me != null && hasMePermission(me, "read", "Pole");

  const { data: organisations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: fetchOrganizations,
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

  const schema = useMemo(() => buildSchema(organisations), [organisations]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      organizationId: "",
      poleId: "",
      roleId: "",
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

  const createMutation = useMutation({
    mutationFn: async (body: Schema) => {
      const payload: {
        email: string;
        password: string;
        organizationId: string;
        roleId: string;
        firstName?: string;
        lastName?: string;
      } = {
        email: body.email,
        password: body.password,
        organizationId: body.organizationId,
        roleId: body.roleId,
      };
      const first = body.firstName?.trim();
      const last = body.lastName?.trim();
      if (first) payload.firstName = first;
      if (last) payload.lastName = last;
      await api.post("/user", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      router.push("/dashboard/utilisateurs");
    },
    onError: (err) => {
      setError("root", {
        message: apiErrorMessage(err, "Impossible de créer l’utilisateur"),
      });
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

  if (!canCreateUser) {
    return (
      <div
        className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
        role="alert"
      >
        <p className="font-semibold">Accès refusé</p>
        <p className="mt-2">
          Vous n’avez pas la permission de créer des utilisateurs.
        </p>
        <Link
          href="/dashboard/utilisateurs"
          className="mt-4 inline-block font-medium text-orange-700 underline-offset-2 hover:underline"
        >
          Retour à la liste des utilisateurs
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) => createMutation.mutate(data))}
      className="flex w-full max-w-lg flex-col gap-5"
    >
      <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
        Le mot de passe doit respecter la politique de sécurité (9 caractères
        minimum, majuscule, minuscule, chiffre, symbole). Si le compte est en
        première connexion, l’utilisateur devra le changer à la prochaine
        ouverture de session.
        {isMainOrg ? (
          <>
            {" "}
            Pour la maison mère <strong>VIFAA</strong>, sélectionnez d’abord un{" "}
            <strong>pôle</strong>, puis un rôle rattaché à ce pôle.
          </>
        ) : (
          <>
            {" "}
            Pour une <strong>filiale</strong>, une fiche employé active est
            créée automatiquement et liée à ce compte (complétez ensuite le
            poste et le département dans les RH).
          </>
        )}
      </p>

      {errors.root && (
        <p className="text-sm text-red-600" role="alert">
          {errors.root.message}
        </p>
      )}

      <div>
        <label
          htmlFor="user-email"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="user-email"
          type="email"
          autoComplete="off"
          {...register("email")}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="user-first-name"
            className="mb-1 block text-sm font-medium text-gray-800"
          >
            Prénom
          </label>
          <input
            id="user-first-name"
            type="text"
            autoComplete="off"
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
            htmlFor="user-last-name"
            className="mb-1 block text-sm font-medium text-gray-800"
          >
            Nom
          </label>
          <input
            id="user-last-name"
            type="text"
            autoComplete="off"
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
          htmlFor="user-password"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Mot de passe provisoire <span className="text-red-500">*</span>
        </label>
        <input
          id="user-password"
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

      <div>
        <label
          htmlFor="user-org"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Organisation <span className="text-red-500">*</span>
        </label>
        <select
          id="user-org"
          {...register("organizationId", {
            onChange: () => {
              setValue("poleId", "");
              setValue("roleId", "");
            },
          })}
          disabled={orgsLoading}
          className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 disabled:opacity-60"
          aria-invalid={!!errors.organizationId}
        >
          <option value="">— Choisir —</option>
          {orgsSorted.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        {errors.organizationId && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.organizationId.message}
          </p>
        )}
      </div>

      {isMainOrg ? (
        <div>
          <label
            htmlFor="user-pole"
            className="mb-1 block text-sm font-medium text-gray-800"
          >
            Pôle <span className="text-red-500">*</span>
          </label>
          <select
            id="user-pole"
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
          htmlFor="user-role"
          className="mb-1 block text-sm font-medium text-gray-800"
        >
          Rôle <span className="text-red-500">*</span>
        </label>
        <select
          id="user-role"
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
            <option key={r.id} value={r.id} title={r.description ?? undefined}>
              {r.name}
            </option>
          ))}
        </select>
        {errors.roleId && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.roleId.message}
          </p>
        )}
        {organizationId &&
          (!isMainOrg || poleId) &&
          roleOptions.length === 0 &&
          !rolesLoading && (
            <p className="mt-1 text-xs text-amber-800">
              {isMainOrg
                ? "Aucun rôle rattaché à ce pôle. Créez un rôle pour ce pôle ou choisissez un autre pôle."
                : "Aucun rôle compatible pour cette filiale."}
            </p>
          )}
      </div>

      <button
        type="submit"
        disabled={
          isSubmitting ||
          createMutation.isPending ||
          orgsLoading ||
          rolesLoading ||
          (isMainOrg && polesLoading)
        }
        className="w-fit rounded-lg bg-orange-500 px-5 py-2.5 font-semibold text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting || createMutation.isPending
          ? "Création…"
          : "Créer l’utilisateur"}
      </button>
    </form>
  );
}
