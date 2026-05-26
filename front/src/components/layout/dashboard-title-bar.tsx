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
    <div className={cn("flex w-full flex-wrap items-center gap-4", className)}>
      {actions ? (
        <div className="flex w-full flex-1 flex-wrap justify-start gap-2 sm:gap-3 sm:w-auto">
          {actions}
        </div>
      ) : null}
      <h1
        className={cn(
          "flex w-full shrink-0 items-center justify-center gap-2 text-center text-2xl font-extrabold text-orange-500 sm:w-auto sm:text-4xl",
          !actions && "sm:justify-start sm:text-left",
        )}
      >
        {Icon ? (
          <Icon className="size-8 shrink-0 sm:size-9" strokeWidth={1.75} />
        ) : null}
        {title}
      </h1>
      <div className="hidden min-h-px flex-1 sm:block" aria-hidden />
    </div>
  );
}
