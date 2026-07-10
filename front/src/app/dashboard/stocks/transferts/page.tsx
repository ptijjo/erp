"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeftRight, ChevronLeft } from "lucide-react";

import { STOCK_TRANSFER_STATUS_LABEL } from "~/app/dashboard/_lib/pole-status-labels";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { PaginatedResponse, StockDto, StockTransferDto } from "~/lib/api-types";
import { extractApiList, FULL_LIST_QUERY } from "~/lib/api-list";
import { apiErrorMessage } from "~/lib/api-error-message";
import { useScopedOrganizations } from "~/lib/use-scoped-organizations";

export default function StockTransfertsPage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { main, subsidiaries, defaultOrganizationId } =
    useScopedOrganizations();

  const canRead =
    me != null && hasMePermission(me, "read", "StockTransfer");
  const canCreate =
    me != null && hasMePermission(me, "create", "StockTransfer");
  const canUpdate =
    me != null && hasMePermission(me, "update", "StockTransfer");

  const [fromOrgId, setFromOrgId] = useState("");
  const effectiveFromOrgId =
    fromOrgId ||
    (main
      ? (subsidiaries[0]?.id ?? defaultOrganizationId)
      : (me?.organisationId ?? ""));

  const [toOrgId, setToOrgId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [filterOrg, setFilterOrg] = useState("all");

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["stock-transfer", filterOrg] as const,
    queryFn: async () => {
      const { data } = await api.get<StockTransferDto[]>("/stock-transfer", {
        params:
          main && filterOrg !== "all"
            ? { organizationId: filterOrg }
            : undefined,
      });
      return data;
    },
    enabled: canRead,
  });

  const { data: stocks = [] } = useQuery({
    queryKey: ["stock"] as const,
    queryFn: async () => {
      const { data } = await api.get<StockDto[] | PaginatedResponse<StockDto>>(
        "/stock",
        FULL_LIST_QUERY,
      );
      return extractApiList(data);
    },
    enabled: canCreate && Boolean(effectiveFromOrgId),
  });

  const fromStocks = useMemo(
    () =>
      stocks.filter(
        (s) =>
          s.organizationId === effectiveFromOrgId &&
          s.organization.organizationType === "SUBSIDIARY" &&
          s.quantity > 0,
      ),
    [stocks, effectiveFromOrgId],
  );

  const toOrgOptions = useMemo(
    () => subsidiaries.filter((o) => o.id !== effectiveFromOrgId),
    [subsidiaries, effectiveFromOrgId],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post("/stock-transfer", {
        fromOrganizationId: effectiveFromOrgId,
        toOrganizationId: toOrgId,
        productId,
        quantity: Number(quantity),
        note: note.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setProductId("");
      setQuantity("1");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["stock-transfer"] });
      await queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Transfert impossible"));
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "SHIPPED" | "RECEIVED" | "CANCELLED";
    }) => {
      await api.patch(`/stock-transfer/${id}/status`, { status });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stock-transfer"] });
      await queryClient.invalidateQueries({ queryKey: ["stock"] });
      await queryClient.invalidateQueries({ queryKey: ["stock-movement"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Mise à jour impossible"));
    },
  });

  function canShip(row: StockTransferDto) {
    return (
      row.status === "PENDING" &&
      (main || me?.organisationId === row.fromOrganizationId)
    );
  }

  function canReceive(row: StockTransferDto) {
    return (
      row.status === "SHIPPED" &&
      (main || me?.organisationId === row.toOrganizationId)
    );
  }

  function canCancel(row: StockTransferDto) {
    return (
      row.status === "PENDING" &&
      (main || me?.organisationId === row.fromOrganizationId)
    );
  }

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Transferts de stock"
          description="Vous n'avez pas accès aux transferts inter-filiales."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Transferts de stock"
        description="Mouvements de marchandises entre filiales."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/stocks">
              <ChevronLeft className="mr-1 size-4" />
              Stocks
            </Link>
          </Button>
        }
      />

      {canCreate ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowLeftRight className="size-4" />
              Nouveau transfert
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {main ? (
              <div>
                <Label>Organisation source</Label>
                <Select value={effectiveFromOrgId} onValueChange={setFromOrgId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subsidiaries.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div>
              <Label>Organisation destination</Label>
              <Select value={toOrgId} onValueChange={setToOrgId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {toOrgOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Produit</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {fromStocks.map((s) => (
                    <SelectItem key={s.productId} value={s.productId}>
                      {s.product.name} (stock : {s.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transfer-qty">Quantité</Label>
              <Input
                id="transfer-qty"
                type="number"
                min={1}
                className="mt-1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="transfer-note">Note</Label>
              <Input
                id="transfer-note"
                className="mt-1"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                disabled={
                  !effectiveFromOrgId ||
                  !toOrgId ||
                  !productId ||
                  Number(quantity) < 1 ||
                  createMutation.isPending
                }
                onClick={() => createMutation.mutate()}
              >
                Créer le transfert
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-base">
            Transferts ({transfers.length})
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
          ) : transfers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun transfert.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Produit</th>
                    <th className="pb-2 pr-4">De → Vers</th>
                    <th className="pb-2 pr-4">Qté</th>
                    <th className="pb-2 pr-4">Statut</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transfers.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 font-medium">
                        {row.product.name}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {row.fromOrganization.name} →{" "}
                        {row.toOrganization.name}
                      </td>
                      <td className="py-2 pr-4">{row.quantity}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary">
                          {STOCK_TRANSFER_STATUS_LABEL[row.status]}
                        </Badge>
                      </td>
                      <td className="py-2">
                        {canUpdate ? (
                          <div className="flex flex-wrap gap-1">
                            {canShip(row) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={statusMutation.isPending}
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: row.id,
                                    status: "SHIPPED",
                                  })
                                }
                              >
                                Expédier
                              </Button>
                            ) : null}
                            {canReceive(row) ? (
                              <Button
                                size="sm"
                                disabled={statusMutation.isPending}
                                onClick={() =>
                                  statusMutation.mutate({
                                    id: row.id,
                                    status: "RECEIVED",
                                  })
                                }
                              >
                                Réceptionner
                              </Button>
                            ) : null}
                            {canCancel(row) ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={statusMutation.isPending}
                                onClick={() => {
                                  if (window.confirm("Annuler ce transfert ?")) {
                                    statusMutation.mutate({
                                      id: row.id,
                                      status: "CANCELLED",
                                    });
                                  }
                                }}
                              >
                                Annuler
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
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
