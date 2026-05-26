import { DashboardSubpageHeader } from "~/components/layout/dashboard-subpage-header";
import { dashboardMainCenteredClass } from "~/lib/dashboard-styles";

import AddUserForm from "../_components/AddUserForm";

export default function AddUserPage() {
  return (
    <main className={dashboardMainCenteredClass}>
      <DashboardSubpageHeader
        title="Ajouter un utilisateur"
        backHref="/dashboard/utilisateurs"
      />
      <AddUserForm />
    </main>
  );
}
