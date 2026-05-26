import { DashboardSubpageHeader } from "~/components/layout/dashboard-subpage-header";
import { dashboardMainCenteredClass } from "~/lib/dashboard-styles";

import AddRoleForm from "../../_components/AddRoleForm";

export default function AddRolePage() {
  return (
    <main className={dashboardMainCenteredClass}>
      <DashboardSubpageHeader
        title="Nouveau rôle"
        backHref="/dashboard/utilisateurs"
      />
      <AddRoleForm />
    </main>
  );
}
