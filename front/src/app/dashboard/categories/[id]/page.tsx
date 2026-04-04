import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import EditCategoryForm from "../../produits/_components/EditCategoryForm";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditCategoryPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col items-center gap-8 overflow-auto bg-white p-6">
      <div className="flex w-full items-center">
        <div className="flex flex-1 justify-start">
          <Link
            href="/dashboard/categories"
            className="flex w-fit cursor-pointer items-center gap-2 rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-orange-500"
          >
            <ArrowLeft className="size-4" />
            Retour
          </Link>
        </div>
        <h1 className="shrink-0 text-4xl font-extrabold text-orange-500">
          Modifier la catégorie
        </h1>
        <div className="flex-1" />
      </div>

      <EditCategoryForm categoryId={id} />
    </main>
  );
}
