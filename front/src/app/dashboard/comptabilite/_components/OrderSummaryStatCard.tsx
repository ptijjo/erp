import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";

type OrderSummaryStatCardProps = {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  iconClassName?: string;
};

export function OrderSummaryStatCard({
  title,
  value,
  hint,
  icon: Icon,
  iconClassName,
}: OrderSummaryStatCardProps) {
  return (
    <Card className="gap-0 py-3 shadow-sm">
      <CardHeader className="px-4 pb-1">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className={cn("size-4 shrink-0", iconClassName)} />
          <span className="line-clamp-2 leading-snug">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0">
        <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
