"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck } from "lucide-react";

import {
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { SupplierDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

import { apiErrorMessage } from "../produits/_lib/api-error-message";

const ORANGE = "#FF8C00";

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

  if (mePending) {
    return (
      <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto bg-[#F3F4F6] p-6">
        <p className="text-sm text-gray-600">Chargement…</p>
      </main>
    );
  }

  if (!me || !isMain || !canRead) {
    return (
      <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto bg-[#F3F4F6] p-6">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Réservé à la maison mère avec la permission{" "}
          <span className="font-mono">read:Supplier</span>.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-8 overflow-auto bg-[#F3F4F6] p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div
          className="flex size-11 items-center justify-center rounded-xl bg-white shadow-sm"
          style={{ color: ORANGE }}
          aria-hidden
        >
          <Truck className="size-6" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-wide text-[#2D323E]">
            Fournisseurs
          </h1>
          <p className="text-sm text-gray-600">
            Fiches fournisseur pour les commandes de réapprovisionnement des
            filiales. Affectez un fournisseur sur chaque produit modifiable par
            la maison mère.
          </p>
        </div>
      </header>

      {canCreate ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-[#2D323E]">
            Nouveau fournisseur
          </h2>
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
          <div className="mt-4 flex justify-end">
            <button
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
                createMutation.mutate();
              }}
              disabled={createMutation.isPending}
              className="h-10 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: ORANGE }}
            >
              {createMutation.isPending ? "Création…" : "Créer"}
            </button>
          </div>
        </section>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-gray-600">Chargement des fournisseurs…</p>
      ) : suppliers.length === 0 ? (
        <p className="text-sm text-gray-600">Aucun fournisseur.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">Nom</th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Prix ref.
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-[#2D323E]">
                    Actions
                  </th>
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
                      {canDelete ? (
                        <button
                          type="button"
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
                          className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
                        >
                          Supprimer
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
