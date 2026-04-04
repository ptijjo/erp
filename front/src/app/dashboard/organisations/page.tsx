"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SquarePlus } from "lucide-react";

import { api } from "~/lib/api";
import type { OrganizationDto } from "~/lib/api-types";

export default function OrganisationsPage() {
  const { data: organizations = [], isLoading, isError } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto[]>("/organisation");
      return data;
    },
  });

  return (
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-4 overflow-auto bg-white p-6">
      <div className="flex w-full items-center">
        <div className="flex flex-1 justify-start">
          <Link
            href="/dashboard/organisations/add"
            className="flex w-fit cursor-pointer items-center gap-2 rounded-md bg-gray-100 p-4 transition-all duration-300 hover:bg-gray-200"
          >
            <SquarePlus className="size-4" /> Nouvelle filiale
          </Link>
        </div>
        <h1 className="shrink-0 text-4xl font-extrabold text-orange-500">
          Organisations
        </h1>
        <div className="flex-1" />
      </div>

      {isError && (
        <p className="text-center text-red-600">
          Impossible de charger les organisations.
        </p>
      )}

      {isLoading ? (
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
                <th className="px-4 py-3 font-semibold text-gray-900">Nom</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Slug</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
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
