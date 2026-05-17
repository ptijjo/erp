"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, Layers, SquarePlus } from "lucide-react";

import { api } from "~/lib/api";
import type { OrganizationDto } from "~/lib/api-types";
import {
  dashboardHomePath,
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";

function OrganisationSortIcon({
  column,
  sortBy,
  sortOrder,
}: {
  column: "name" | "slug";
  sortBy: "name" | "slug";
  sortOrder: "asc" | "desc";
}) {
  if (sortBy !== column) return <ArrowUpDown className="size-3.5 text-gray-400" />;
  return sortOrder === "asc" ? (
    <ArrowUp className="size-3.5 text-orange-600" />
  ) : (
    <ArrowDown className="size-3.5 text-orange-600" />
  );
}

export default function OrganisationsPage() {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<"name" | "slug">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { data: me } = useMe();
  const canReadOrganization =
    me != null && hasMePermission(me, "read", "Organization");
  const canCreateOrganization =
    me != null && hasMePermission(me, "create", "Organization");
  const canCreatePole =
    me != null && hasMePermission(me, "create", "Pole");

  useEffect(() => {
    if (!me) return;
    if (!isMainOrganization(me) && me.organizationSlug) {
      router.replace(dashboardHomePath(me));
    }
  }, [me, router]);

  const { data: organizations = [], isLoading, isError } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto[]>("/organisation");
      return data;
    },
  });
  const sortedOrganizations = useMemo(() => {
    const collator = new Intl.Collator("fr", { sensitivity: "base" });
    return [...organizations].sort((a, b) => {
      const left = sortBy === "name" ? a.name : a.slug;
      const right = sortBy === "name" ? b.name : b.slug;
      const result = collator.compare(left, right);
      return sortOrder === "asc" ? result : -result;
    });
  }, [organizations, sortBy, sortOrder]);

  function toggleSort(column: "name" | "slug") {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortOrder("asc");
  }

  if (me && !isMainOrganization(me)) {
    return (
      <main className="flex flex-1 items-center justify-center bg-white p-6 text-gray-600">
        Redirection…
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-4 overflow-auto bg-white p-6">
      <div className="flex w-full items-center">
        <div className="flex flex-1 flex-wrap justify-start gap-3">
          {canCreateOrganization && (
            <Link
              href="/dashboard/organisations/add"
              className="flex w-fit cursor-pointer items-center gap-2 rounded-md bg-gray-100 p-4 transition-all duration-300 hover:bg-gray-200"
            >
              <SquarePlus className="size-4" /> Nouvelle filiale
            </Link>
          )}
          {canCreatePole && (
            <Link
              href="/dashboard/organisations/poles/add"
              className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-orange-200 bg-orange-50/80 p-4 font-medium text-orange-900 transition-all duration-300 hover:bg-orange-100"
            >
              <Layers className="size-4" /> Nouveau pôle
            </Link>
          )}
        </div>
        <h1 className="shrink-0 text-4xl font-extrabold text-orange-500">
          Organisations
        </h1>
        <div className="flex-1" />
      </div>

      {!canReadOrganization ? (
        <div
          className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Accès refusé</p>
          <p className="mt-2">
            Vous n’avez pas la permission de consulter les organisations.
          </p>
        </div>
      ) : null}

      {canReadOrganization && isError && (
        <p className="text-center text-red-600">
          Impossible de charger les organisations.
        </p>
      )}

      {!canReadOrganization ? null : isLoading ? (
        <p className="flex flex-1 items-center justify-center text-center text-gray-600">
          Chargement…
        </p>
      ) : organizations.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-center text-gray-600">
          Aucune organisation. Créez-en une ou vérifiez vos droits d’accès.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-semibold text-gray-900">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 text-left hover:text-orange-600"
                    onClick={() => toggleSort("name")}
                    aria-label="Trier par nom"
                  >
                    Nom
                    <OrganisationSortIcon
                      column="name"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                    />
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold text-gray-900">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 text-left hover:text-orange-600"
                    onClick={() => toggleSort("slug")}
                    aria-label="Trier par slug"
                  >
                    Slug
                    <OrganisationSortIcon
                      column="slug"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                    />
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrganizations.map((org) => (
                <tr
                  key={org.id}
                  className="border-b border-gray-100 hover:bg-gray-50/80"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {org.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">
                    {org.slug}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/organisations/${org.slug}`}
                      className="text-orange-600 underline-offset-2 hover:underline"
                    >
                      Détails
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
