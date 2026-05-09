"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { AuditLogListItemDto } from "~/lib/api-types";

const ACTION_LABEL: Record<AuditLogListItemDto["action"], string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
};

function formatDetails(details: unknown): string {
  if (details === null || details === undefined) {
    return "—";
  }
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

export default function AuditJournalPage() {
  const router = useRouter();
  const { data: me, isPending: mePending } = useMe();
  const canReadAudit =
    me != null && hasMePermission(me, "read", "AuditLog");

  useEffect(() => {
    if (mePending || !me) return;
    if (!canReadAudit) {
      router.replace("/dashboard");
    }
  }, [me, mePending, canReadAudit, router]);

  const { data: entries = [], isLoading, isError } = useQuery({
    queryKey: ["audit-log"] as const,
    queryFn: async () => {
      const { data } = await api.get<AuditLogListItemDto[]>("/audit-log", {
        params: { take: 300 },
      });
      return data;
    },
    enabled: canReadAudit,
  });

  if (mePending || !me || !canReadAudit) {
    return (
      <main className="flex min-h-0 flex-1 flex-col bg-white p-6">
        <p className="text-gray-600">Chargement…</p>
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-4 overflow-auto bg-white p-6">
      <header className="flex flex-col gap-1 border-b border-gray-200 pb-4">
        <h1 className="text-xl font-semibold text-gray-900">
          Journal d&apos;audit
        </h1>
        <p className="text-sm text-gray-600">
          Historique des créations, modifications et suppressions. Les
          administrateurs, le directeur général et le directeur des opérations y
          accèdent sans permission supplémentaire ; les autres profils nécessitent
          la permission{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
            read:AuditLog
          </code>
          .
        </p>
      </header>

      {isError && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Impossible de charger le journal. Vérifiez votre connexion ou vos droits.
        </p>
      )}

      {isLoading ? (
        <p className="text-gray-600">Chargement des entrées…</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-100 text-gray-700">
              <tr>
                <th className="border-b border-gray-200 px-3 py-2 font-medium">
                  Date (UTC)
                </th>
                <th className="border-b border-gray-200 px-3 py-2 font-medium">
                  Action
                </th>
                <th className="border-b border-gray-200 px-3 py-2 font-medium">
                  Entité
                </th>
                <th className="border-b border-gray-200 px-3 py-2 font-medium">
                  Id
                </th>
                <th className="border-b border-gray-200 px-3 py-2 font-medium">
                  Utilisateur
                </th>
                <th className="border-b border-gray-200 px-3 py-2 font-medium">
                  Organisation
                </th>
                <th className="border-b border-gray-200 px-3 py-2 font-medium">
                  Détails
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-gray-500"
                  >
                    Aucune entrée pour l&apos;instant.
                  </td>
                </tr>
              ) : (
                entries.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 odd:bg-white even:bg-gray-50/80"
                  >
                    <td className="whitespace-nowrap px-3 py-2 align-top text-gray-800">
                      {new Date(row.createdAt).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top">
                      <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900">
                        {ACTION_LABEL[row.action] ?? row.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top font-medium text-gray-900">
                      {row.entityType}
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2 align-top font-mono text-xs text-gray-700">
                      {row.entityId ?? "—"}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2 align-top text-gray-800">
                      {row.user?.email ?? "—"}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2 align-top text-gray-800">
                      {row.organization?.name ?? "—"}
                    </td>
                    <td className="max-w-md px-3 py-2 align-top">
                      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-2 font-mono text-[11px] leading-snug text-gray-700">
                        {formatDetails(row.details)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
