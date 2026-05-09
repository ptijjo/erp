"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";

import {
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { api } from "~/lib/api";
import type {
  BudgetDto,
  BudgetLineCategoryDto,
  OrganizationDto,
} from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

import { apiErrorMessage } from "../produits/_lib/api-error-message";

const CATEGORY_LABEL: Record<BudgetLineCategoryDto, string> = {
  LOYER: "Loyer",
};

const STATUS_LABEL: Record<BudgetDto["status"], string> = {
  DRAFT: "Brouillon",
  APPROVED: "Validé",
};

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

type LineForm = {
  category: BudgetLineCategoryDto;
  label: string;
  amountPlanned: string;
};

function emptyLine(): LineForm {
  return { category: "LOYER", label: "", amountPlanned: "" };
}

function budgetTotalFcfa(b: BudgetDto): number {
  return b.lines.reduce(
    (s, l) => s + parseDecimal(l.amountPlanned),
    0,
  );
}

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const canReadBudget =
    me != null && hasMePermission(me, "read", "Budget");
  const canCreateBudget =
    me != null && hasMePermission(me, "create", "Budget");
  const canUpdateBudget =
    me != null && hasMePermission(me, "update", "Budget");
  const canDeleteBudget =
    me != null && hasMePermission(me, "delete", "Budget");
  const isMain = me != null && isMainOrganization(me);

  const [subsidiaryId, setSubsidiaryId] = useState("");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ["budget"] as const,
    queryFn: async () => {
      const { data } = await api.get<BudgetDto[]>("/budget");
      return data;
    },
    enabled: Boolean(me && canReadBudget),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto[]>("/organisation");
      return data;
    },
    enabled: Boolean(
      me && isMain && (canCreateBudget || canUpdateBudget),
    ),
  });

  const subsidiaries = useMemo(
    () =>
      organizations.filter((o) => o.organizationType === "SUBSIDIARY"),
    [organizations],
  );

  useEffect(() => {
    if (!subsidiaries.length || subsidiaryId) return;
    setSubsidiaryId(subsidiaries[0]?.id ?? "");
  }, [subsidiaries, subsidiaryId]);

  type SaveBody = {
    subsidiaryOrganizationId: string;
    year: number;
    month: number;
    lines: {
      category: BudgetLineCategoryDto;
      label: string;
      amountPlanned: number;
    }[];
  };

  const saveMutation = useMutation({
    mutationFn: async ({
      editingBudgetId,
      body,
    }: {
      editingBudgetId: string | null;
      body: SaveBody;
    }) => {
      if (editingBudgetId) {
        await api.patch(`/budget/${editingBudgetId}`, {
          lines: body.lines,
        });
        return;
      }
      await api.post("/budget", body);
    },
    onSuccess: async () => {
      setEditingId(null);
      setLines([emptyLine()]);
      await queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Enregistrement impossible"));
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/budget/${id}/approve`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Validation impossible"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/budget/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Suppression impossible"));
    },
  });

  function startEdit(b: BudgetDto) {
    setEditingId(b.id);
    setSubsidiaryId(b.subsidiaryOrganizationId);
    setYear(b.year);
    setMonth(b.month);
    setLines(
      b.lines.map((l) => ({
        category: l.category,
        label: l.label,
        amountPlanned: String(parseDecimal(l.amountPlanned)),
      })),
    );
  }

  function cancelEdit() {
    setEditingId(null);
    setLines([emptyLine()]);
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!isMain) return;
    if (editingId && !canUpdateBudget) return;
    if (!editingId && !canCreateBudget) return;

    const parsedLines: SaveBody["lines"] = [];
    for (const row of lines) {
      const amt = Number(row.amountPlanned.replace(",", "."));
      if (!row.label.trim()) {
        alert("Chaque ligne doit avoir un libellé.");
        return;
      }
      if (Number.isNaN(amt) || amt < 0) {
        alert("Indiquez un montant valide (≥ 0) pour chaque ligne.");
        return;
      }
      parsedLines.push({
        category: row.category,
        label: row.label.trim(),
        amountPlanned: amt,
      });
    }

    if (!editingId && !subsidiaryId) {
      alert("Choisissez une filiale.");
      return;
    }

    saveMutation.mutate({
      editingBudgetId: editingId,
      body: {
        subsidiaryOrganizationId: subsidiaryId,
        year,
        month,
        lines: parsedLines,
      },
    });
  }

  if (mePending || !me) {
    return (
      <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-white p-6">
        <p className="text-gray-600">Chargement…</p>
      </main>
    );
  }

  if (!canReadBudget) {
    return (
      <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-white p-6">
        <h1 className="text-4xl font-extrabold text-orange-500">Budgets</h1>
        <p className="mt-4 text-gray-600">
          Vous n’avez pas la permission de consulter les budgets.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-6 overflow-auto bg-white p-6">
      <div>
        <h1 className="flex items-center gap-2 text-4xl font-extrabold text-orange-500">
          <Wallet className="size-9 shrink-0" />
          Budgets filiales
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          {isMain
            ? "La maison mère crée et valide les budgets mensuels par filiale. Les montants sont en FCFA. Pour l’instant, les lignes portent sur le loyer ; d’autres catégories suivront."
            : "Budgets validés pour votre organisation (FCFA)."}
        </p>
      </div>

      {isMain &&
      (canCreateBudget || (editingId && canUpdateBudget)) ? (
        <section className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingId ? "Modifier le brouillon" : "Nouveau budget (brouillon)"}
          </h2>
          <form className="mt-4 space-y-4" onSubmit={submitForm}>
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[200px] flex-1">
                <label className="block text-sm font-medium text-gray-700">
                  Filiale
                </label>
                <select
                  required={!editingId}
                  disabled={Boolean(editingId)}
                  value={subsidiaryId}
                  onChange={(e) => setSubsidiaryId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:bg-gray-100"
                >
                  <option value="">— Choisir —</option>
                  {subsidiaries.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="block text-sm font-medium text-gray-700">
                  Année
                </label>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  disabled={Boolean(editingId)}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm disabled:bg-gray-100"
                />
              </div>
              <div className="w-44">
                <label className="block text-sm font-medium text-gray-700">
                  Mois
                </label>
                <select
                  disabled={Boolean(editingId)}
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:bg-gray-100"
                >
                  {MONTHS_FR.map((label, i) => (
                    <option key={label} value={i + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">
                Lignes budgétaires
              </div>
              {lines.map((row, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="min-w-[120px]">
                    <label className="text-xs text-gray-500">Catégorie</label>
                    <select
                      value={row.category}
                      onChange={(e) => {
                        const v = e.target.value as BudgetLineCategoryDto;
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === idx ? { ...l, category: v } : l,
                          ),
                        );
                      }}
                      className="mt-0.5 h-9 w-full rounded border border-gray-300 px-2 text-sm"
                    >
                      <option value="LOYER">{CATEGORY_LABEL.LOYER}</option>
                    </select>
                  </div>
                  <div className="min-w-[180px] flex-1">
                    <label className="text-xs text-gray-500">Libellé</label>
                    <input
                      value={row.label}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === idx ? { ...l, label: e.target.value } : l,
                          ),
                        )
                      }
                      placeholder="ex. Loyer local centre-ville"
                      className="mt-0.5 h-9 w-full rounded border border-gray-300 px-2 text-sm"
                    />
                  </div>
                  <div className="w-36">
                    <label className="text-xs text-gray-500">
                      Montant (FCFA)
                    </label>
                    <input
                      inputMode="numeric"
                      value={row.amountPlanned}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === idx
                              ? { ...l, amountPlanned: e.target.value }
                              : l,
                          ),
                        )
                      }
                      className="mt-0.5 h-9 w-full rounded border border-gray-300 px-2 text-sm font-mono"
                    />
                  </div>
                  {lines.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setLines((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="inline-flex h-9 items-center rounded border border-red-200 px-2 text-red-700 hover:bg-red-50"
                      aria-label="Supprimer la ligne"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                <Plus className="size-4" />
                Ajouter une ligne
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {editingId ? "Enregistrer les lignes" : "Créer le brouillon"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
              ) : null}
            </div>
          </form>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-gray-900">
          Liste des budgets
        </h2>
        {budgetsLoading ? (
          <p className="mt-2 text-sm text-gray-600">Chargement…</p>
        ) : budgets.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">Aucun budget.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  {isMain ? (
                    <th className="px-4 py-3 font-semibold text-[#2D323E]">
                      Filiale
                    </th>
                  ) : null}
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Période
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-[#2D323E]">
                    Total (FCFA)
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Lignes
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-[#2D323E]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    {isMain ? (
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {b.subsidiaryOrganization.name}
                      </td>
                    ) : null}
                    <td className="whitespace-nowrap px-4 py-3 text-gray-800">
                      {MONTHS_FR[b.month - 1]} {b.year}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          b.status === "DRAFT"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-emerald-100 text-emerald-900"
                        }`}
                      >
                        {STATUS_LABEL[b.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                      {formatFcfa(budgetTotalFcfa(b))}
                    </td>
                    <td className="max-w-md px-4 py-3 text-gray-700">
                      <ul className="list-inside list-disc text-xs">
                        {b.lines.map((l) => (
                          <li key={l.id}>
                            {CATEGORY_LABEL[l.category]} — {l.label} :{" "}
                            {formatFcfa(parseDecimal(l.amountPlanned))}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isMain && b.status === "DRAFT" ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          {canUpdateBudget ? (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(b)}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                              >
                                <Pencil className="size-3.5" />
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  approveMutation.mutate(b.id)
                                }
                                disabled={approveMutation.isPending}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Valider
                              </button>
                            </>
                          ) : null}
                          {canDeleteBudget ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Supprimer ce brouillon de budget ?",
                                  )
                                ) {
                                  deleteMutation.mutate(b.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
                            >
                              Supprimer
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
