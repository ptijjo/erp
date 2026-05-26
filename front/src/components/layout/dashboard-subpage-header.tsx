import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { dashboardBackLinkClass } from "~/lib/dashboard-styles";
import { cn } from "~/lib/utils";

type DashboardSubpageHeaderProps = {
  title: string;
  backHref: string;
  backLabel?: string;
  className?: string;
};

export function DashboardSubpageHeader({
  title,
  backHref,
  backLabel = "Retour",
  className,
}: DashboardSubpageHeaderProps) {
  return (
    <div className={cn("flex w-full flex-wrap items-center gap-4", className)}>
      <div className="flex w-full flex-1 sm:w-auto">
        <Link href={backHref} className={dashboardBackLinkClass}>
          <ArrowLeft className="size-4 shrink-0" />
          {backLabel}
        </Link>
      </div>
      <h1 className="w-full shrink-0 text-center text-2xl font-extrabold text-orange-500 sm:flex-1 sm:text-4xl">
        {title}
      </h1>
      <div className="hidden min-h-px flex-1 sm:block" aria-hidden />
    </div>
  );
}
