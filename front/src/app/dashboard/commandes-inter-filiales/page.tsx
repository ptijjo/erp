"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight } from "lucide-react";

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
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { StockOrderDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";
import {
  useEffectiveOrganizationId,
  useSubsidiaryContext,
} from "~/providers/subsidiary-context";

type DirectionFilter = "all" | "sent" | "received";

const STATUS_LABEL: Record<StockOrderDto["status"], string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  CANCELLED: "Annulée",
};

function orderTotal(order: StockOrderDto): number {
  return order.quantity * parseDecimal(order.unitPrice);
}

function filterByDirection(
  orders: StockOrderDto[],
  direction: DirectionFilter,
  isMain: boolean,
  effectiveOrgId: string,
): StockOrderDto[] {
  if (direction === "all") {
    return orders;
  }
  if (isMain) {
    if (direction === "received") {
      return orders.filter(
        (o) => o.subsidiaryOrganizationId !== effectiveOrgId,
      );
    }
    return orders.filter(
      (o) => o.subsidiaryOrganizationId === effectiveOrgId,
    );
  }
  if (direction === "sent") {
    return orders.filter(
      (o) => o.subsidiaryOrganizationId === effectiveOrgId,
    );
  }
  return [];
}

export default function CommandesInterFilialesPage() {
  const { data: me } = useMe();
  const { selectedSubsidiaryId } = useSubsidiaryContext();
  const effectiveOrgId = useEffectiveOrganizationId(me);
  const main = me != null && isMainOrganization(me);

  const canRead = me != null && hasMePermission(me, "read", "StockOrder");
  const [direction, setDirection] = useState<DirectionFilter>("all");

  const subsidiaryQueryId =
    main && selectedSubsidiaryId ? selectedSubsidiaryId : undefined;

  const { data: orders = [], isLoading } = useQuery({
    queryKey: [
      "stock-order",
      "inter-filiales",
      subsidiaryQueryId ?? "all",
    ] as const,
    queryFn: async () => {
      const { data } = await api.get<StockOrderDto[]>("/stock-order", {
        params: subsidiaryQueryId
          ? { subsidiaryOrganizationId: subsidiaryQueryId }
          : undefined,
      });
      return data;
    },
    enabled: canRead,
  });

  const filteredOrders = useMemo(
    () =>
      filterByDirection(orders, direction, main, effectiveOrgId),
    [orders, direction, main, effectiveOrgId],
  );

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Commandes inter-filiales"
          description="Vous n'avez pas accès aux commandes inter-filiales."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Commandes inter-filiales"
        description={
          main
            ? "Commandes passées par les filiales auprès de la maison mère."
            : "Vos commandes adressées à la maison mère."
        }
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["all", "Toutes"],
            ["sent", "Envoyées"],
            ["received", "Reçues"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={direction === value ? "default" : "outline"}
            onClick={() => setDirection(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="size-4" />
            Commandes ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : filteredOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune commande pour ce filtre.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Filiale</th>
                    <th className="pb-2 pr-4">Produit</th>
                    <th className="pb-2 pr-4">Quantité</th>
                    <th className="pb-2 pr-4">Montant</th>
                    <th className="pb-2 pr-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {new Date(row.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2 pr-4">
                        {row.subsidiaryOrganization.name}
                      </td>
                      <td className="py-2 pr-4 font-medium">
                        {row.product.name}
                      </td>
                      <td className="py-2 pr-4">{row.quantity}</td>
                      <td className="py-2 pr-4">
                        {formatFcfa(orderTotal(row))}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary">
                          {STATUS_LABEL[row.status]}
                        </Badge>
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
