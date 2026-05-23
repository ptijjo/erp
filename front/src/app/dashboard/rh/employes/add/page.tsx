"use client";

import Link from "next/link";

import { AddEmployeeForm } from "../../_components/AddEmployeeForm";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";

export default function AddEmployePage() {
  return (
    <PageShell>
      <PageHeader
        title="Nouvel employé"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/rh/employes">Retour</Link>
          </Button>
        }
      />
      <AddEmployeeForm />
    </PageShell>
  );
}
