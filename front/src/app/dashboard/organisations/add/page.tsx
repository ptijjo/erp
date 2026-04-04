import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import AddOrganisationForm from "../_components/AddOrganisationForm";

const AddOrganizationPage = () => {
    return (
        <main className="flex flex-col flex-1 min-h-0 min-w-0 w-full h-full bg-white p-6 overflow-auto gap-8 items-center">
            <div className="flex items-center w-full">
                <div className="flex-1 flex justify-start">
                    <Link href="/dashboard/organisations" className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors w-fit cursor-pointer hover:bg-gray-100 p-2 rounded-md">
                        <ArrowLeft className="size-4" />
                        Retour
                    </Link>
                </div>
                <h1 className="text-4xl font-extrabold text-orange-500 shrink-0 text-center">
                  Nouvelle filiale
                </h1>
                <div className="flex-1" />
            </div>

            <AddOrganisationForm />
        </main>
    );
};

export default AddOrganizationPage;