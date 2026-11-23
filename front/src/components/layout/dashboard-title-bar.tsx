import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

type DashboardTitleBarProps = {
  title: string;
  actions?: ReactNode;
  icon?: LucideIcon;
  className?: string;
};

export function DashboardTitleBar({
  title,
  actions,
  icon: Icon,
  className,
}: DashboardTitleBarProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <h1 className="flex min-w-0 items-center gap-2.5 text-xl font-semibold text-foreground">
        {Icon ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" strokeWidth={1.75} />
          </span>
        ) : null}
        <span className="truncate">{title}</span>
      </h1>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
