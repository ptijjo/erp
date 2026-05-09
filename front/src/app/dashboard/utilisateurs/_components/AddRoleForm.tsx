"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { hasMePermission, isAdminUser, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { OrganizationDto, PermissionDto, RoleDto } from "~/lib/api-types";

import { apiErrorMessage } from "../../produits/_lib/api-error-message";

const schema = z.object({
  roleName: z.string().min(1, { message: "Le nom du rôle est requis" }).trim(),
  roleDescription: z.string().optional(),
  organizationScopeId: z.string().optional(),
});

type Schema = z.infer<typeof schema>;

export default function AddRoleForm() {
  const { data: me, isPending: mePending } = useMe();
  const canCreateRole = me != null && hasMePermission(me, "create", "Role");
  const canManagePermissions =
    me != null && hasMePermission(me, "update", "Permission");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedExisting, setSelectedExisting] = useState<Set<string>>(
    () => new Set(),
  );
  const [permSearch, setPermSearch] = useState("");
  const [rootError, setRootError] = useState<string | null>(null);

  const { data: organisations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto[]>("/organisation");
      return data;
    },
    enabled: canCreateRole,
  });

  const { data: allPermissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ["permission", "assignment"] as const,
    queryFn: async () => {
      const { data } = await api.get<PermissionDto[]>(
        "/permission/for-assignment",
      );
      return data;
    },
    enabled: canManagePermissions,
  });

  const orgsSorted = useMemo(
    () =>
      [...organisations].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [organisations],
  );

  const permissionsFiltered = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    const list = [...allPermissions].sort((a, b) =>
      a.name.localeCompare(b.name, "fr"),
    );
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false),
    );
  }, [allPermissions, permSearch]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: {
      roleName: "",
      roleDescription: "",
      organizationScopeId: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (values: Schema) => {
      const rolePayload: {
        name: string;
        description?: string;
        organizationScopeId?: string;
      } = {
        name: values.roleName.trim(),
      };
      if (values.roleDescription?.trim()) {
        rolePayload.description = values.roleDescription.trim();
      }
      if (values.organizationScopeId?.trim()) {
        rolePayload.organizationScopeId = values.organizationScopeId.trim();
      }

      const { data: role } = await api.post<RoleDto>("/role", rolePayload);

      if (canManagePermissions) {
        for (const permissionId of selectedExisting) {
          await api.post("/permission/link", {
            permissionId,
            roleId: role.id,
          });
        }
      }

      return role;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["role"] });
      await queryClient.invalidateQueries({
        queryKey: ["permission", "assignment"],
      });
      await queryClient.invalidateQueries({ queryKey: ["permission"] });
      router.push("/dashboard/utilisateurs");
    },
    onError: (err) => {
      setRootError(
        apiErrorMessage(err, "Impossible de créer le rôle ou les liaisons"),
      );
    },
  });

  function toggleExisting(id: string) {
    setSelectedExisting((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (mePending) {
    return <p className="text-sm text-gray-600">Vérification des droits…</p>;
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

  if (!canCreateRole) {
    return (
      <div
        className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
        role="alert"
      >
        <p className="font-semibold">Accès refusé</p>
        <p className="mt-2">Vous n’avez pas la permission de créer des rôles.</p>
        <Link
          href="/dashboard/utilisateurs/roles"
          className="mt-4 inline-block font-medium text-orange-700 underline-offset-2 hover:underline"
        >
          Retour à la liste des rôles
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
        <h2 className="text-lg font-semibold text-[#2D323E]">Rôle</h2>
        <p className="mt-1 text-sm text-gray-600">
          Le nom est normalisé en majuscules côté serveur. Périmètre optionnel
          pour limiter le rôle à une organisation.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label
              htmlFor="role-name"
              className="mb-1 block text-sm font-medium text-gray-800"
            >
              Nom du rôle <span className="text-red-500">*</span>
            </label>
            <input
              id="role-name"
              {...register("roleName")}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
              placeholder="Ex. CAISSIER_FILIALE"
              aria-invalid={!!errors.roleName}
            />
            {errors.roleName && (
              <p className="mt-1 text-sm text-red-600">{errors.roleName.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="role-desc"
              className="mb-1 block text-sm font-medium text-gray-800"
            >
              Description <span className="text-gray-400">(facultatif)</span>
            </label>
            <textarea
              id="role-desc"
              rows={2}
              {...register("roleDescription")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
            />
          </div>
          <div>
            <label
              htmlFor="role-scope"
              className="mb-1 block text-sm font-medium text-gray-800"
            >
              Périmètre organisation{" "}
              <span className="text-gray-400">(facultatif)</span>
            </label>
            <select
              id="role-scope"
              {...register("organizationScopeId")}
              disabled={orgsLoading}
              className="h-10 w-full cursor-pointer rounded-lg border border-gray-300 px-3 disabled:opacity-60"
            >
              <option value="">— Rôle global (toutes organisations) —</option>
              {orgsSorted.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {!canManagePermissions && (
        <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          Seuls l’administrateur, le directeur général et le directeur des
          opérations peuvent associer des permissions. Vous pouvez créer un rôle
          vide et demander ensuite l’attribution des droits.
        </p>
      )}

      {canManagePermissions && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#2D323E]">
            Permissions à associer
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {isAdminUser(me) ? (
              <>
                Les entrées du catalogue se créent dans le{" "}
                <Link
                  href="/dashboard/utilisateurs/permissions/add"
                  className="font-medium text-orange-600 underline-offset-2 hover:underline"
                >
                  formulaire dédié
                </Link>{" "}
                ou le{" "}
                <Link
                  href="/dashboard/utilisateurs/permissions"
                  className="font-medium text-orange-600 underline-offset-2 hover:underline"
                >
                  catalogue
                </Link>
                ; cochez ici celles à lier à ce nouveau rôle.
              </>
            ) : (
              <>
                Cochez les permissions existantes pour les lier à ce rôle. Seul
                l’administrateur peut modifier le catalogue des permissions.
              </>
            )}
          </p>
          <input
            type="search"
            value={permSearch}
            onChange={(e) => setPermSearch(e.target.value)}
            placeholder="Filtrer par nom ou description…"
            className="mt-3 h-10 w-full max-w-md rounded-lg border border-gray-300 px-3 text-sm"
          />
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-gray-100">
            {permsLoading ? (
              <p className="p-4 text-sm text-gray-500">Chargement…</p>
            ) : permissionsFiltered.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">
                <p>Aucune permission en base.</p>
                {isAdminUser(me) ? (
                  <Link
                    href="/dashboard/utilisateurs/permissions/add"
                    className="mt-2 inline-block font-medium text-orange-600 underline-offset-2 hover:underline"
                  >
                    Créer une permission
                  </Link>
                ) : (
                  <p className="mt-2 text-xs text-gray-600">
                    Contactez l’administrateur pour alimenter le catalogue.
                  </p>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {permissionsFiltered.map((p) => (
                  <li key={p.id} className="flex items-start gap-3 px-3 py-2">
                    <input
                      type="checkbox"
                      id={`perm-${p.id}`}
                      checked={selectedExisting.has(p.id)}
                      onChange={() => toggleExisting(p.id)}
                      className="mt-1 size-4 cursor-pointer rounded border-gray-300"
                    />
                    <label
                      htmlFor={`perm-${p.id}`}
                      className="min-w-0 flex-1 cursor-pointer text-sm"
                    >
                      <span className="font-mono font-medium text-[#2D323E]">
                        {p.name}
                      </span>
                      {p.description && (
                        <span className="mt-0.5 block text-gray-600">
                          {p.description}
                        </span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <button
        type="submit"
        disabled={
          isSubmitting ||
          submitMutation.isPending ||
          orgsLoading ||
          (canManagePermissions && permsLoading)
        }
        className="w-fit rounded-lg bg-orange-500 px-6 py-2.5 font-semibold text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting || submitMutation.isPending
          ? "Enregistrement…"
          : canManagePermissions
            ? "Créer le rôle et les liaisons"
            : "Créer le rôle"}
      </button>
    </form>
  );
}
