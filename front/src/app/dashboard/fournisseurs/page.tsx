"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Truck } from "lucide-react";

import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { SupplierDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";
import { apiErrorMessage } from "~/lib/api-error-message";

export default function FournisseursPage() {
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const isMain = me != null && isMainOrganization(me);
  const canRead =
    me != null && hasMePermission(me, "read", "Supplier");
  const canCreate =
    me != null && hasMePermission(me, "create", "Supplier");
  const canDelete =
    me != null && hasMePermission(me, "delete", "Supplier");
  const canUpdate =
    me != null && hasMePermission(me, "update", "Supplier");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["supplier"] as const,
    queryFn: async () => {
      const { data } = await api.get<SupplierDto[]>("/supplier");
      return data;
    },
    enabled: Boolean(me && isMain && canRead),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post("/supplier", {
        name: name.trim(),
        price: Number(price),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
    },
    onSuccess: async () => {
      setName("");
      setPrice("");
      setEmail("");
      setPhone("");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["supplier"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible de créer le fournisseur"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/supplier/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["supplier"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible de supprimer"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const p = Number(price);
      await api.patch(`/supplier/${editingId}`, {
        name: name.trim(),
        price: p,
        email: email.trim() || null,
        phone: phone.trim() || null,
        note: note.trim() || null,
      });
    },
    onSuccess: async () => {
      setEditingId(null);
      setName("");
      setPrice("");
      setEmail("");
      setPhone("");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["supplier"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible de modifier le fournisseur"));
    },
  });

  function startEdit(s: SupplierDto) {
    setEditingId(s.id);
    setName(s.name);
    setPrice(String(parseDecimal(s.price)));
    setEmail(s.email ?? "");
    setPhone(s.phone ?? "");
    setNote(s.note ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setPrice("");
    setEmail("");
    setPhone("");
    setNote("");
  }

  if (mePending) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-32 w-full rounded-xl" />
      </PageShell>
    );
  }

  if (!me || !isMain || !canRead) {
    return (
      <PageShell>
        <PageHeader title="Fournisseurs" />
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Réservé à la maison mère avec la permission{" "}
          <span className="font-mono">read:Supplier</span>.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Fournisseurs"
        description="Fiches fournisseur pour le réapprovisionnement des filiales."
        actions={<Truck className="size-8 shrink-0 text-primary" aria-hidden />}
      />

      <div className="mt-6 flex flex-col gap-6">

      {canCreate || (canUpdate && editingId) ? (
        <Card className="py-4">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg">
              {editingId ? "Modifier le fournisseur" : "Nouveau fournisseur"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                placeholder="Raison sociale"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Prix de référence (FCFA) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                placeholder="0"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Prix d’achat indicatif pour les commandes filiales (réappro.).
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Téléphone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Note
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                placeholder="Coordonnées complémentaires…"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            {editingId ? (
              <Button type="button" variant="outline" onClick={cancelEdit}>
                Annuler
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={() => {
                if (!name.trim()) {
                  alert("Le nom est requis");
                  return;
                }
                const p = Number(price);
                if (!Number.isFinite(p) || p < 0) {
                  alert("Indiquez un prix de référence valide (≥ 0 FCFA)");
                  return;
                }
                if (editingId) {
                  updateMutation.mutate();
                } else {
                  createMutation.mutate();
                }
              }}
              disabled={
                createMutation.isPending || updateMutation.isPending
              }
            >
              {editingId
                ? updateMutation.isPending
                  ? "Enregistrement…"
                  : "Enregistrer"
                : createMutation.isPending
                  ? "Création…"
                  : "Créer"}
            </Button>
          </div>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-gray-600">Chargement des fournisseurs…</p>
      ) : suppliers.length === 0 ? (
        <p className="text-sm text-gray-600">Aucun fournisseur.</p>
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Prix ref.</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {s.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-800">
                      {formatFcfa(parseDecimal(s.price))}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {[s.email, s.phone].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-3">
                        {canUpdate ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(s)}
                          >
                            <Pencil className="size-3.5" />
                            Modifier
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Supprimer le fournisseur « ${s.name} » ?`,
                                )
                              ) {
                                return;
                              }
                              deleteMutation.mutate(s.id);
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            Supprimer
                          </Button>
                        ) : null}
                        {!canUpdate && !canDelete ? (
                          <span className="text-gray-400">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      </div>
    </PageShell>
  );
}
