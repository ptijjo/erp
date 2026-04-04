"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { api } from "~/lib/api";
import type { UserDetailDto } from "~/lib/api-types";

export default function UserDetailPage() {
  const params = useParams();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["user", id] as const,
    queryFn: async () => {
      const { data } = await api.get<UserDetailDto>(`/user/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  return (
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-white p-6">
      <div className="flex w-full items-center">
        <div className="flex flex-1 justify-start">
          <Link
            href="/dashboard/utilisateurs"
            className="flex w-fit cursor-pointer items-center gap-2 rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-orange-500"
          >
            <ArrowLeft className="size-4" />
            Retour
          </Link>
        </div>
        <h1 className="shrink-0 text-4xl font-extrabold text-orange-500">
          Utilisateur
        </h1>
        <div className="flex-1" />
      </div>

      {isError && (
        <p className="mt-8 text-red-600">Utilisateur introuvable ou accès refusé.</p>
      )}

      {isLoading ? (
        <p className="mt-8 text-gray-600">Chargement…</p>
      ) : user ? (
        <div className="mt-8 max-w-xl space-y-3 text-gray-800">
          <p>
            <span className="font-semibold text-gray-900">Email :</span>{" "}
            {user.email}
          </p>
          <p>
            <span className="font-semibold text-gray-900">Rôle :</span>{" "}
            {user.role.name}
          </p>
          {user.role.description ? (
            <p className="text-sm text-gray-600">{user.role.description}</p>
          ) : null}
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">Organisation (id) :</span>{" "}
            <code className="font-mono">{user.organizationId}</code>
          </p>
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">Id :</span>{" "}
            <code className="font-mono">{user.id}</code>
          </p>
        </div>
      ) : null}
    </main>
  );
}
