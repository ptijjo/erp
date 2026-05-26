"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { DashboardTitleBar } from "~/components/layout/dashboard-title-bar";
import { DesktopOnly, MobileOnly } from "~/components/layout/viewport";
import { TableScroll } from "~/components/layout/table-scroll";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { AuditLogListItemDto } from "~/lib/api-types";
import { dashboardMainClass } from "~/lib/dashboard-styles";

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

function AuditEntryCard({ row }: { row: AuditLogListItemDto }) {
  return (
    <article className="space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <time className="text-xs text-gray-600">
          {new Date(row.createdAt).toLocaleString("fr-FR", {
            dateStyle: "short",
            timeStyle: "medium",
          })}
        </time>
        <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900">
          {ACTION_LABEL[row.action] ?? row.action}
        </span>
      </div>
      <p className="font-medium text-gray-900">{row.entityType}</p>
      <p className="font-mono text-xs text-gray-700 break-all">
        {row.entityId ?? "—"}
      </p>
      <p className="text-gray-800">{row.user?.email ?? "—"}</p>
      <p className="text-gray-700">{row.organization?.name ?? "—"}</p>
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-2 font-mono text-[11px] leading-snug text-gray-700">
        {formatDetails(row.details)}
      </pre>
    </article>
  );
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
      <main className={dashboardMainClass}>
        <p className="text-gray-600">Chargement…</p>
      </main>
    );
  }

  return (
    <main className={`${dashboardMainClass} gap-4`}>
      <DashboardTitleBar title="Journal d'audit" />
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

      {isError && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Impossible de charger le journal. Vérifiez votre connexion ou vos droits.
        </p>
      )}

      {isLoading ? (
        <p className="text-gray-600">Chargement des entrées…</p>
      ) : entries.length === 0 ? (
        <p className="text-center text-gray-500">Aucune entrée pour l&apos;instant.</p>
      ) : (
        <>
          <MobileOnly className="flex flex-col gap-3">
            {entries.map((row) => (
              <AuditEntryCard key={row.id} row={row} />
            ))}
          </MobileOnly>
          <DesktopOnly>
            <TableScroll className="border-gray-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-gray-100 text-gray-700">
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
                  {entries.map((row) => (
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
