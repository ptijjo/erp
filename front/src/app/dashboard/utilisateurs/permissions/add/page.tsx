import { DashboardSubpageHeader } from "~/components/layout/dashboard-subpage-header";
import { dashboardMainCenteredClass } from "~/lib/dashboard-styles";

import AddPermissionForm from "../../_components/AddPermissionForm";

export default function AddPermissionPage() {
  return (
    <main className={dashboardMainCenteredClass}>
      <DashboardSubpageHeader
        title="Nouvelle permission"
        backHref="/dashboard/utilisateurs/permissions"
        backLabel="Retour au catalogue"
      />
      <AddPermissionForm />
    </main>
  );
}
