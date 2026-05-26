import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

type ViewportProps = {
  children: ReactNode;
  className?: string;
};

/** Contenu visible uniquement sur écrans &lt; md. */
export function MobileOnly({ children, className }: ViewportProps) {
  return <div className={cn("md:hidden", className)}>{children}</div>;
}

/** Contenu visible à partir de md. */
export function DesktopOnly({ children, className }: ViewportProps) {
  return <div className={cn("hidden md:block", className)}>{children}</div>;
}
