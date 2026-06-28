"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronLeft, History } from "lucide-react";

import { STOCK_MOVEMENT_TYPE_LABEL } from "~/app/dashboard/_lib/pole-status-labels";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { StockMovementDto } from "~/lib/api-types";
import { useScopedOrganizations } from "~/lib/use-scoped-organizations";

export default function StockMouvementsPage() {
  const { data: me } = useMe();
  const { main, subsidiaries } = useScopedOrganizations();

  const canRead =
    me != null && hasMePermission(me, "read", "StockMovement");

  const [filterOrg, setFilterOrg] = useState("all");

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["stock-movement", filterOrg] as const,
    queryFn: async () => {
      const { data } = await api.get<StockMovementDto[]>("/stock-movement", {
        params:
          main && filterOrg !== "all"
            ? { organizationId: filterOrg }
            : undefined,
      });
      return data;
    },
    enabled: canRead,
  });

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Journal des mouvements"
          description="Vous n'avez pas accès au journal de stock."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Journal des mouvements"
        description="Traçabilité des entrées, sorties et ajustements de stock."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/stocks">
              <ChevronLeft className="mr-1 size-4" />
              Stocks
            </Link>
          </Button>
        }
      />

      <Card className="mt-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" />
            Derniers mouvements ({movements.length})
          </CardTitle>
          {main ? (
            <Select value={filterOrg} onValueChange={setFilterOrg}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les filiales</SelectItem>
                {subsidiaries.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun mouvement enregistré.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Organisation</th>
                    <th className="pb-2 pr-4">Produit</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Variation</th>
                    <th className="pb-2">Libellé</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {movements.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                        {new Date(row.createdAt).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-2 pr-4">{row.organization.name}</td>
                      <td className="py-2 pr-4 font-medium">
                        {row.product.name}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline">
                          {STOCK_MOVEMENT_TYPE_LABEL[row.type]}
                        </Badge>
                      </td>
                      <td
                        className={`py-2 pr-4 font-medium ${
                          row.quantityDelta > 0
                            ? "text-green-700"
                            : "text-destructive"
                        }`}
                      >
                        {row.quantityDelta > 0 ? "+" : ""}
                        {row.quantityDelta}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {row.label ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
