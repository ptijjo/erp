"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import { EmployeeContractsPanel } from "../../_components/EmployeeContractsPanel";
import { EmployeeLeaveBalancesPanel } from "../../_components/EmployeeLeaveBalancesPanel";
import { EmployeeSalariesPanel } from "../../_components/EmployeeSalariesPanel";
import { employeeDisplayName } from "../../_lib/employee-display";
import { isoToDateInput } from "../../_lib/date-input";
import { EMPLOYEE_STATUS_LABEL } from "../../_lib/hr-labels";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { EmployeeDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";

export default function EmployeDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const { data: me } = useMe();
  const canUpdate = me != null && hasMePermission(me, "update", "Employee");
  const canDelete = me != null && hasMePermission(me, "delete", "Employee");

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ["hr", "employees", id] as const,
    queryFn: async () => {
      const { data } = await api.get<EmployeeDto>(`/hr/employees/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/hr/employees/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr"] });
      router.push("/dashboard/rh/employes");
    },
  });

  return (
    <PageShell>
      <PageHeader
        title={employee ? employeeDisplayName(employee) : "Employé"}
        description={
          employee ? (
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {EMPLOYEE_STATUS_LABEL[employee.status]}
              </Badge>
              {employee.position ? (
                <span>{employee.position}</span>
              ) : null}
            </span>
          ) : undefined
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/rh/employes">
                <ArrowLeft className="size-4" />
                Liste
              </Link>
            </Button>
            {employee && canUpdate ? (
              <Button size="sm" variant="secondary" asChild>
                <Link href={`/dashboard/rh/employes/${id}/edit`}>
                  <Pencil className="size-4" />
                  Modifier
                </Link>
              </Button>
            ) : null}
            {employee && canDelete ? (
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Supprimer ${employeeDisplayName(employee)} ? Action irréversible.`,
                    )
                  ) {
                    deleteMutation.mutate();
                  }
                }}
              >
                <Trash2 className="size-4" />
                Supprimer
              </Button>
            ) : null}
          </div>
        }
      />

      {deleteMutation.isError ? (
        <p className="text-sm text-destructive">
          {apiErrorMessage(deleteMutation.error, "Suppression impossible")}
        </p>
      ) : null}

      {isError ? (
        <p className="text-sm text-destructive">Employé introuvable.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : employee ? (
        <div className="space-y-8">
          <section className="grid max-w-2xl gap-2 text-sm">
            <p>
              <span className="font-medium">Email :</span>{" "}
              {employee.email ?? "—"}
            </p>
            <p>
              <span className="font-medium">Téléphone :</span>{" "}
              {employee.phone ?? "—"}
            </p>
            <p>
              <span className="font-medium">Département :</span>{" "}
              {employee.department?.name ?? "—"}
            </p>
            <p>
              <span className="font-medium">Manager :</span>{" "}
              {employee.manager
                ? employeeDisplayName(employee.manager)
                : "—"}
            </p>
            <p>
              <span className="font-medium">Compte utilisateur :</span>{" "}
              {employee.user?.email ?? "—"}
            </p>
            <p>
              <span className="font-medium">Embauche :</span>{" "}
              {isoToDateInput(employee.hireDate)}
              {employee.terminationDate
                ? ` · Sortie : ${isoToDateInput(employee.terminationDate)}`
                : ""}
            </p>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <EmployeeContractsPanel employeeId={employee.id} />
            <EmployeeSalariesPanel employeeId={employee.id} />
            <EmployeeLeaveBalancesPanel employeeId={employee.id} />
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
