import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  /** Sans padding horizontal supplémentaire si contenu pleine largeur */
  fullBleed?: boolean;
};

export function PageShell({
  children,
  className,
  fullBleed = false,
}: PageShellProps) {
  return (
    <main
      className={cn(
        "flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-background",
        fullBleed ? "p-0" : "p-4 md:p-6 lg:p-8",
        className,
      )}
    >
      {children}
    </main>
  );
}
