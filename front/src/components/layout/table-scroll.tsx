import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

type TableScrollProps = {
  children: ReactNode;
  className?: string;
  /** Débordement horizontal dans le padding de la page (mobile). */
  bleed?: boolean;
};

export function TableScroll({
  children,
  className,
  bleed = true,
}: TableScrollProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-border",
        bleed && "-mx-4 px-4 sm:mx-0 sm:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
