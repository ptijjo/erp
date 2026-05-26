import { DashboardSubpageHeader } from "~/components/layout/dashboard-subpage-header";
import { dashboardMainCenteredClass } from "~/lib/dashboard-styles";

import EditProductForm from "../_components/EditProductForm";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className={dashboardMainCenteredClass}>
      <DashboardSubpageHeader
        title="Modifier le produit"
        backHref="/dashboard/produits"
      />
      <EditProductForm productId={id} />
    </main>
  );
}
