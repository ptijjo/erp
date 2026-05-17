import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5",
        className,
      )}
    >
      <section className="min-w-0 flex-1 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.65rem]">
          {title}
        </h1>
        {description ? (
          <section className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </section>
        ) : null}
      </section>
      {actions ? (
        <section className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </section>
      ) : null}
    </header>
  );
}
