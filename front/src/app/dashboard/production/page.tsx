"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Factory, Pencil, Trash2 } from "lucide-react";

import { OrganizationSelectField } from "~/app/dashboard/_components/OrganizationSelectField";
import { PRODUCTION_STATUS_LABEL } from "~/app/dashboard/_lib/pole-status-labels";
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
import type {
  ProductDto,
  ProductionOrderDto,
  ProductionOrderStatusDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { useScopedOrganizations } from "~/lib/use-scoped-organizations";

const STATUS_OPTIONS = Object.entries(PRODUCTION_STATUS_LABEL) as [
  ProductionOrderStatusDto,
  string,
][];

const NO_PRODUCT = "none";

export default function ProductionPage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { main, selectableOrgs, defaultOrganizationId } =
    useScopedOrganizations();

  const canRead =
    me != null && hasMePermission(me, "read", "ProductionOrder");
  const canCreate =
    me != null && hasMePermission(me, "create", "ProductionOrder");
  const canUpdate =
    me != null && hasMePermission(me, "update", "ProductionOrder");
  const canDelete =
    me != null && hasMePermission(me, "delete", "ProductionOrder");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const formOrganizationId = organizationId || defaultOrganizationId;
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [productId, setProductId] = useState(NO_PRODUCT);
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<ProductionOrderStatusDto>("PLANNED");
  const [notes, setNotes] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["production", "orders"] as const,
    queryFn: async () => {
      const { data } = await api.get<ProductionOrderDto[]>(
        "/production/orders",
      );
      return data;
    },
    enabled: canRead,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["product"] as const,
    queryFn: async () => {
      const { data } = await api.get<ProductDto[]>("/product");
      return data;
    },
    enabled: canRead,
  });

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setQuantity("1");
    setProductId(NO_PRODUCT);
    setScheduledAt("");
    setStatus("PLANNED");
    setNotes("");
    setOrganizationId("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const orgId = main ? formOrganizationId : me!.organisationId;
      const qty = Number(quantity);
      const body = {
        title: title.trim(),
        quantity: qty,
        productId: productId === NO_PRODUCT ? undefined : productId,
        scheduledAt: scheduledAt || undefined,
        status,
        notes: notes.trim() || undefined,
      };
      if (editingId) {
        await api.patch(`/production/orders/${editingId}`, body);
      } else {
        await api.post("/production/orders", {
          organizationId: orgId,
          ...body,
        });
      }
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["production"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Enregistrement impossible"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/production/orders/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["production"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Suppression impossible"));
    },
  });

  function startEdit(row: ProductionOrderDto) {
    setEditingId(row.id);
    setOrganizationId(row.organizationId);
    setTitle(row.title);
    setQuantity(String(row.quantity));
    setProductId(row.productId ?? NO_PRODUCT);
    setScheduledAt(row.scheduledAt?.slice(0, 10) ?? "");
    setStatus(row.status);
    setNotes(row.notes ?? "");
  }

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Production"
          description="Vous n'avez pas accès aux ordres de production."
        />
      </PageShell>
    );
  }

  const orgName = (id: string) =>
    selectableOrgs.find((o) => o.id === id)?.name ?? id.slice(0, 8);

  return (
    <PageShell>
      <PageHeader
        title="Production"
        description="Ordres de fabrication et planning du pôle production."
      />

      {(canCreate || canUpdate) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Factory className="size-4" />
              {editingId ? "Modifier l'ordre" : "Nouvel ordre de production"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {main && !editingId ? (
              <OrganizationSelectField
                id="production-org"
                label="Organisation"
                organizations={selectableOrgs}
                value={formOrganizationId}
                onChange={setOrganizationId}
              />
            ) : null}
            <div>
              <Label htmlFor="production-title">Intitulé</Label>
              <Input
                id="production-title"
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="production-qty">Quantité</Label>
              <Input
                id="production-qty"
                type="number"
                min={1}
                className="mt-1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label>Produit (optionnel)</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PRODUCT}>— Aucun —</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="production-date">Planifié le</Label>
              <Input
                id="production-date"
                type="date"
                className="mt-1"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(v as ProductionOrderStatusDto)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="production-notes">Notes</Label>
              <textarea
                id="production-notes"
                className="mt-1 w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                disabled={
                  !title.trim() ||
                  !quantity ||
                  Number(quantity) < 1 ||
                  saveMutation.isPending ||
                  (main && !editingId && !formOrganizationId)
                }
                onClick={() => saveMutation.mutate()}
              >
                {editingId ? "Enregistrer" : "Créer"}
              </Button>
              {editingId ? (
                <Button variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Ordres ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun ordre de production.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Intitulé</th>
                    <th className="pb-2 pr-4">Organisation</th>
                    <th className="pb-2 pr-4">Produit</th>
                    <th className="pb-2 pr-4">Qté</th>
                    <th className="pb-2 pr-4">Statut</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 font-medium">{row.title}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {orgName(row.organizationId)}
                      </td>
                      <td className="py-2 pr-4">
                        {row.product?.name ?? "—"}
                      </td>
                      <td className="py-2 pr-4">{row.quantity}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary">
                          {PRODUCTION_STATUS_LABEL[row.status]}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          {canUpdate ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Modifier"
                              onClick={() => startEdit(row)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Supprimer"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Supprimer « ${row.title} » ?`,
                                  )
                                ) {
                                  deleteMutation.mutate(row.id);
                                }
                              }}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          ) : null}
                        </div>
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
