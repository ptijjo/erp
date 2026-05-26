"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, Layers, SquarePlus } from "lucide-react";

import { DashboardTitleBar } from "~/components/layout/dashboard-title-bar";
import { DesktopOnly, MobileOnly } from "~/components/layout/viewport";
import { TableScroll } from "~/components/layout/table-scroll";
import { api } from "~/lib/api";
import type { OrganizationDto } from "~/lib/api-types";
import {
  dashboardHomePath,
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import {
  dashboardActionLinkMuted,
  dashboardActionLinkPrimary,
  dashboardMainClass,
} from "~/lib/dashboard-styles";

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

  function openOrganisation(slug: string) {
    router.push(`/dashboard/organisations/${slug}`);
  }

  if (me && !isMainOrganization(me)) {
    return (
      <main className="flex flex-1 items-center justify-center bg-white p-4 sm:p-6 text-gray-600">
        Redirection…
      </main>
    );
  }

  return (
    <main className={`${dashboardMainClass} gap-4`}>
      <DashboardTitleBar
        title="Organisations"
        actions={
          <>
            {canCreateOrganization ? (
              <Link
                href="/dashboard/organisations/add"
                className={dashboardActionLinkMuted}
              >
                <SquarePlus className="size-4 shrink-0" /> Nouvelle filiale
              </Link>
            ) : null}
            {canCreatePole ? (
              <Link
                href="/dashboard/organisations/poles/add"
                className={dashboardActionLinkPrimary}
              >
                <Layers className="size-4 shrink-0" /> Nouveau pôle
              </Link>
            ) : null}
          </>
        }
      />

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
        <>
          <MobileOnly>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 hover:border-orange-200 hover:text-orange-600"
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
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 hover:border-orange-200 hover:text-orange-600"
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
          </div>

          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {sortedOrganizations.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  className="flex w-full cursor-pointer flex-col gap-1 px-4 py-4 text-left transition-colors hover:bg-gray-50/80 active:bg-gray-100"
                  onClick={() => openOrganisation(org.slug)}
                  aria-label={`Voir ${org.name}`}
                >
                  <span className="font-medium text-gray-900">{org.name}</span>
                  <span className="font-mono text-sm text-gray-600">
                    {org.slug}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          </MobileOnly>

          <DesktopOnly>
          <TableScroll className="border-gray-200">
            <table className="w-full text-left text-sm">
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
                </tr>
              </thead>
              <tbody>
                {sortedOrganizations.map((org) => (
                  <tr
                    key={org.id}
                    className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50/80"
                    onClick={() => openOrganisation(org.slug)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") {
                        openOrganisation(org.slug);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Voir ${org.name}`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {org.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600">
                      {org.slug}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          </DesktopOnly>
        </>
      )}
    </main>
  );
}
