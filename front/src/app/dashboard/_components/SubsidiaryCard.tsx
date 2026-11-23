import Link from "next/link";
import { Building2, TrendingUp, Users } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { formatFcfa } from "~/lib/format-fcfa";
import { cn } from "~/lib/utils";

export type SubsidiaryCardData = {
  organizationId: string;
  name: string;
  slug: string;
  description?: string | null;
  revenueFcfa?: number;
  employeesActive?: number;
  utilizationPercent?: number;
  overBudget?: boolean;
  atRisk?: boolean;
};

type SubsidiaryCardProps = {
  subsidiary: SubsidiaryCardData;
  className?: string;
};

function statusBadge(subsidiary: SubsidiaryCardData) {
  if (subsidiary.overBudget) {
    return (
      <Badge variant="destructive" className="font-normal">
        Dépassement budget
      </Badge>
    );
  }
  if (subsidiary.atRisk) {
    return (
      <Badge className="bg-sky-100 font-normal text-sky-900 hover:bg-sky-100">
        À surveiller
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-100 font-normal text-emerald-900 hover:bg-emerald-100">
      Active
    </Badge>
  );
}

export function SubsidiaryCard({ subsidiary, className }: SubsidiaryCardProps) {
  const utilization = subsidiary.utilizationPercent ?? 0;

  return (
    <Link
      href={`/dashboard/hq/organisations/${subsidiary.slug}`}
      className={cn(
        "bg-card focus-visible:ring-primary flex flex-col rounded-xl border p-5 shadow-sm transition-shadow outline-none hover:shadow-md focus-visible:ring-2",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="bg-sidebar flex size-11 shrink-0 items-center justify-center rounded-lg text-white">
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{subsidiary.name}</h3>
            <p className="text-muted-foreground mt-0.5 truncate text-sm">
              {subsidiary.description?.trim() || "Filiale du groupe VIFAA"}
            </p>
          </div>
        </div>
        {statusBadge(subsidiary)}
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        {subsidiary.employeesActive != null ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <Users className="size-4 shrink-0" />
            <dd>{subsidiary.employeesActive} employé(s) actif(s)</dd>
          </div>
        ) : null}
        {subsidiary.revenueFcfa != null ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <TrendingUp className="size-4 shrink-0 text-emerald-600" />
            <dd className="text-foreground font-medium">
              {formatFcfa(subsidiary.revenueFcfa)}
            </dd>
          </div>
        ) : null}
      </dl>

      {subsidiary.utilizationPercent != null ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Budget consommé</span>
            <span className="font-medium tabular-nums">
              {utilization.toFixed(0)} %
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                subsidiary.overBudget ? "bg-destructive" : "bg-primary",
              )}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
        </div>
      ) : null}
    </Link>
  );
}
