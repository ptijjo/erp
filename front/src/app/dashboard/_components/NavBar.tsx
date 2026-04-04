"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Package,
    FolderTree,
    ShoppingCart,
    ShoppingBag,
    Layers,
    Wallet,
    FileText,
    Receipt,
    Settings,
    Building2
} from "lucide-react";

const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Utilisateurs", href: "/dashboard/utilisateurs", icon: Users },
    { label: "Organisations", href: "/dashboard/organisations", icon: Building2 },
    { label: "Produits", href: "/dashboard/produits", icon: Package },
    { label: "Catégories", href: "/dashboard/categories", icon: FolderTree },
    { label: "Commandes", href: "/dashboard/commandes", icon: ShoppingCart },
    { label: "Ventes", href: "/dashboard/ventes", icon: ShoppingBag },
    { label: "Stocks", href: "/dashboard/stocks", icon: Layers },
    { label: "Caisse", href: "/dashboard/caisse", icon: Wallet },
    { label: "Factures", href: "/dashboard/facture", icon: FileText },
    { label: "Comptabilité", href: "/dashboard/comptabilite", icon: Receipt },
    { label: "Gestion", href: "/dashboard/gestion", icon: Settings },
] as const;

const NavBar = () => {
    const pathname = usePathname();

    return (
        <nav className="flex shrink-0 flex-col h-full w-44 max-w-44 bg-[#2D323E]">
            <ul className="flex flex-1 flex-col justify-evenly min-h-0 w-full gap-2 px-1">
                {navItems.map(({ label, href, icon: Icon }) => {
                    const isActive =
                        href === "/dashboard"
                            ? pathname === "/dashboard"
                            : pathname.startsWith(href);
                    return (
                        <li key={href} className="w-full min-w-full h-10 min-h-10">
                            <Link
                                href={href}
                                className={`flex items-center px-2 rounded-lg transition-colors w-full h-full ${isActive
                                        ? "bg-[#FF8C00] text-white w-full"
                                        : "text-gray-200 hover:bg-white/10 hover:text-white"
                                    }`}
                                style={{ gap: "4px" }}
                            >
                                <Icon className="size-5 shrink-0" strokeWidth={1.75} />
                                <span className="font-medium">{label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default NavBar;
