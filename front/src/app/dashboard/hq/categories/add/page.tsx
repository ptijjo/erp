import { DashboardSubpageHeader } from "~/components/layout/dashboard-subpage-header";
import { dashboardMainCenteredClass } from "~/lib/dashboard-styles";

import AddCategoryForm from "../../../produits/_components/AddCategoryForm";

export default function AddCategoryPage() {
  return (
    <main className={dashboardMainCenteredClass}>
      <DashboardSubpageHeader
        title="Catégorie / sous-catégorie"
        backHref="/dashboard/hq/categories"
      />
      <AddCategoryForm />
    </main>
  );
}
