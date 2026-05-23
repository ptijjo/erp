"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { EditEmployeeForm } from "../../../_components/EditEmployeeForm";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";

export default function EditEmployePage() {
  const params = useParams();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  return (
    <PageShell>
      <PageHeader
        title="Modifier l’employé"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/rh/employes/${id}`}>Retour</Link>
          </Button>
        }
      />
      {id ? <EditEmployeeForm employeeId={id} /> : null}
    </PageShell>
  );
}
