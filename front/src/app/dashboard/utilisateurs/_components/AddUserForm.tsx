"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "~/lib/api";
import type { OrganizationDto, RoleDto } from "~/lib/api-types";

import { apiErrorMessage } from "../../produits/_lib/api-error-message";

const passwordSchema = z
  .string()
  .min(9, { message: "Au moins 9 caractères" })
  .regex(/[a-z]/, { message: "Au moins une minuscule" })
  .regex(/[A-Z]/, { message: "Au moins une majuscule" })
  .regex(/[0-9]/, { message: "Au moins un chiffre" })
  .regex(/[^a-zA-Z0-9]/, { message: "Au moins un symbole" });

const schema = z.object({
  email: z.string().email({ message: "Email invalide" }).trim(),
  password: passwordSchema,
  organizationId: z.string().uuid({ message: "Choisissez une organisation" }),
  roleId: z.string().uuid({ message: "Choisissez un rôle" }),
});

type Schema = z.infer<typeof schema>;

/** Rôle réservé au seeder : jamais proposé à la création manuelle. */
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

export default function AddUserForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

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
      password: "",
      organizationId: "",
      roleId: "",
    },
  });

  const organizationId = useWatch({ control, name: "organizationId" });

  const roleOptions = useMemo(
    () => rolesForOrganization(roles, organizationId),
    [roles, organizationId],
  );

  const createMutation = useMutation({
    mutationFn: async (body: Schema) => {
      await api.post("/user", {
        email: body.email,
        password: body.password,
        organizationId: body.organizationId,
        roleId: body.roleId,
      });
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
            onChange: () => setValue("roleId", ""),
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
          disabled={rolesLoading || !organizationId || roleOptions.length === 0}
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
        {organizationId && roleOptions.length === 0 && !rolesLoading && (
          <p className="mt-1 text-xs text-amber-800">
            Aucun rôle global ou rattaché à cette organisation. Vérifiez les
            rôles en base.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={
          isSubmitting ||
          createMutation.isPending ||
          orgsLoading ||
          rolesLoading
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
