"use client";

import { MyProfileForm } from "~/app/dashboard/profil/_components/MyProfileForm";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";

export default function ProfilPage() {
  return (
    <PageShell>
      <PageHeader
        title="Mon profil"
        description="Photo et présentation. Le prénom et le nom sont gérés par l’administration."
      />
      <div className="mt-6 max-w-2xl">
        <MyProfileForm />
      </div>
    </PageShell>
  );
}
