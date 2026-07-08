"use client";

import Link from "next/link";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  DoorOpen,
  Gavel,
  Users,
} from "lucide-react";

import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { hasMePermission, isMainOrganization, useMe } from "~/hooks/use-me";

type RhModule = {
  title: string;
  description: string;
  href: string;
  icon: typeof Users;
  subject: string;
  /** Réservé aux filiales (ex. planning piloté par le directeur de filiale). */
  subsidiaryOnly?: boolean;
};

const RH_MODULES: RhModule[] = [
  {
    title: "Employés",
    description: "Fiches, contrats et rémunération",
    href: "/dashboard/rh/employes",
    icon: Users,
    subject: "Employee",
  },
  {
    title: "Départements",
    description: "Services et unités organisationnelles",
    href: "/dashboard/rh/departements",
    icon: Building2,
    subject: "Department",
  },
  {
    title: "Planning",
    description: "Emploi du temps et créneaux de travail",
    href: "/dashboard/rh/planning",
    icon: CalendarRange,
    subject: "WorkShift",
    subsidiaryOnly: true,
  },
  {
    title: "Demandes de congé",
    description: "Demandes et validations",
    href: "/dashboard/rh/conges",
    icon: CalendarDays,
    subject: "LeaveRequest",
  },
  {
    title: "Soldes de congés",
    description: "Quotas annuels par employé",
    href: "/dashboard/rh/soldes-conges",
    icon: CalendarClock,
    subject: "LeaveBalance",
  },
  {
    title: "Sanctions",
    description: "Avertissements et mises à pied",
    href: "/dashboard/rh/sanctions",
    icon: Gavel,
    subject: "EmployeeSanction",
  },
  {
    title: "Départs",
    description: "Sorties et fins de collaboration",
    href: "/dashboard/rh/departs",
    icon: DoorOpen,
    subject: "EmployeeDeparture",
  },
];

export default function RhHubPage() {
  const { data: me, isPending } = useMe();

  const tiles = RH_MODULES.filter((m) => {
    if (me == null) return false;
    if (m.subsidiaryOnly && isMainOrganization(me)) return false;
    return hasMePermission(me, "read", m.subject);
  });

  return (
    <PageShell>
      <PageHeader
        title="Ressources humaines"
        description="Gestion des employés, départements, congés et contrats de travail."
      />

      {isPending ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : tiles.length === 0 ? (
        <p className="text-sm text-amber-800" role="alert">
          Vous n’avez pas la permission de consulter le module RH.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link key={tile.href} href={tile.href} className="group block">
                <Card className="h-full transition-colors hover:border-orange-200 hover:bg-orange-50/30">
                  <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-orange-100 text-orange-700 transition-colors group-hover:bg-orange-200">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </div>
                    <CardTitle className="text-lg">{tile.title}</CardTitle>
                    <CardDescription>{tile.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
