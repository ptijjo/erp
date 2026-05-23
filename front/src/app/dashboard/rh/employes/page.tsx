"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { ListPagination } from "../_components/ListPagination";
import { employeeDisplayName } from "../_lib/employee-display";
import { fetchHrPage } from "../_lib/hr-list";
import { EMPLOYEE_STATUS_LABEL } from "../_lib/hr-labels";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { hasMePermission, useMe } from "~/hooks/use-me";
import type { EmployeeDto } from "~/lib/api-types";

export default function EmployesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");

  const { data: me, isPending: mePending } = useMe();
  const canRead = me != null && hasMePermission(me, "read", "Employee");
  const canCreate = me != null && hasMePermission(me, "create", "Employee");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hr", "employees", page, search] as const,
    queryFn: () =>
      fetchHrPage<EmployeeDto>("/hr/employees", { page, search: search || undefined }),
    enabled: !mePending && canRead,
  });

  const employees = data?.items ?? [];
  const meta = data?.meta;

  return (
    <PageShell>
      <PageHeader
        title="Employés"
        description="Effectifs et fiches RH de votre organisation."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/rh">RH</Link>
            </Button>
            {canCreate ? (
              <Button size="sm" asChild>
                <Link href="/dashboard/rh/employes/add">
                  <Plus className="size-4" />
                  Nouvel employé
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {canRead ? (
        <form
          className="mb-4 flex max-w-md flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchDraft.trim());
          }}
        >
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-sm font-medium">Recherche</label>
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="h-10 w-full rounded-lg border border-input px-3 text-sm"
              placeholder="Nom, prénom ou email"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Filtrer
          </Button>
          {search ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchDraft("");
                setSearch("");
                setPage(1);
              }}
            >
              Effacer
            </Button>
          ) : null}
        </form>
      ) : null}

      {isError ? (
        <p className="text-sm text-destructive">Impossible de charger les employés.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : employees.length === 0 && (meta?.total ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun employé enregistré.</p>
      ) : employees.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun résultat sur cette page.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Poste</th>
                  <th className="px-4 py-3 font-semibold">Département</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr
                    key={e.id}
                    className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                    onClick={() => router.push(`/dashboard/rh/employes/${e.id}`)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") {
                        router.push(`/dashboard/rh/employes/${e.id}`);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                  >
                    <td className="px-4 py-3 font-medium">
                      {employeeDisplayName(e)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.position ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.department?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {EMPLOYEE_STATUS_LABEL[e.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.email ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {meta ? (
        <ListPagination meta={meta} onPageChange={setPage} className="mt-4" />
      ) : null}
    </PageShell>
  );
}
