import type { LucideIcon } from "lucide-react";

import { cn } from "~/lib/utils";

type HqKpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  iconClassName?: string;
  className?: string;
};

export function HqKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName,
  className,
}: HqKpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
            iconClassName,
          )}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
