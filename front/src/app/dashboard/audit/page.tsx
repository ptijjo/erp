"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "~/components/data-table/data-table";
import { DashboardTitleBar } from "~/components/layout/dashboard-title-bar";
import { DesktopOnly, MobileOnly } from "~/components/layout/viewport";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { AuditLogListItemDto } from "~/lib/api-types";
import { dashboardMainClass } from "~/lib/dashboard-styles";
import { erpHomeForOrganizationType } from "~/lib/erp-paths";

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
      <p className="font-mono text-xs break-all text-gray-700">
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
  const canReadAudit = me != null && hasMePermission(me, "read", "AuditLog");

  useEffect(() => {
    if (mePending || !me) return;
    if (!canReadAudit) {
      router.replace(erpHomeForOrganizationType(me.organizationType));
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

  const columns = useMemo<ColumnDef<AuditLogListItemDto>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleString("fr-FR", {
            dateStyle: "short",
            timeStyle: "medium",
          }),
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => (
          <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900">
            {ACTION_LABEL[row.original.action] ?? row.original.action}
          </span>
        ),
      },
      {
        accessorKey: "entityType",
        header: "Entité",
      },
      {
        id: "entityId",
        header: "Id",
        accessorFn: (row) => row.entityId ?? "",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.entityId ?? "—"}
          </span>
        ),
      },
      {
        id: "user",
        header: "Utilisateur",
        accessorFn: (row) => row.user?.email ?? "",
        cell: ({ row }) => row.original.user?.email ?? "—",
      },
      {
        id: "organization",
        header: "Organisation",
        accessorFn: (row) => row.organization?.name ?? "",
        cell: ({ row }) => row.original.organization?.name ?? "—",
      },
      {
        id: "details",
        enableSorting: false,
        header: "Détails",
        cell: ({ row }) => (
          <pre className="max-h-32 max-w-md overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-2 font-mono text-[11px] leading-snug text-gray-700">
            {formatDetails(row.original.details)}
          </pre>
        ),
      },
    ],
    [],
  );

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
        Historique des créations, modifications et suppressions. Tri des
        colonnes via TanStack Table.
      </p>

      {isError && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Impossible de charger le journal. Vérifiez votre connexion ou vos
          droits.
        </p>
      )}

      {isLoading ? (
        <p className="text-gray-600">Chargement des entrées…</p>
      ) : entries.length === 0 ? (
        <p className="text-center text-gray-500">
          Aucune entrée pour l&apos;instant.
        </p>
      ) : (
        <>
          <MobileOnly className="flex flex-col gap-3">
            {entries.map((row) => (
              <AuditEntryCard key={row.id} row={row} />
            ))}
          </MobileOnly>
          <DesktopOnly>
            <DataTable
              columns={columns}
              data={entries}
              emptyMessage="Aucune entrée"
              initialSorting={[{ id: "createdAt", desc: true }]}
            />
          </DesktopOnly>
        </>
      )}
    </main>
  );
}
