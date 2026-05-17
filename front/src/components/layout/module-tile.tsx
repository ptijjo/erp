import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";

type ModuleTileProps = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  className?: string;
};

export function ModuleTile({
  title,
  description,
  href,
  icon: Icon,
  className,
}: ModuleTileProps) {
  return (
    <Link href={href} className={cn("group block h-full", className)}>
      <Card className="h-full gap-0 py-4 transition-shadow hover:border-primary/30 hover:shadow-md">
        <CardHeader className="px-4 pb-0">
          <section className="flex items-start justify-between gap-2">
            <section className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" strokeWidth={1.75} />
            </section>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </section>
          <CardTitle className="mt-3 text-base">{title}</CardTitle>
          <CardDescription className="line-clamp-2 text-sm leading-snug">
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
