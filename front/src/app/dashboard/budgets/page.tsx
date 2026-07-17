"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";

import { BudgetExpenseLedger } from "~/app/dashboard/budgets/_components/BudgetExpenseLedger";
import { BudgetExpensesPanel } from "~/app/dashboard/budgets/_components/BudgetExpensesPanel";
import { BudgetSupplementPanel } from "~/app/dashboard/budgets/_components/BudgetSupplementPanel";
import {
  CATEGORY_LABEL,
  CATEGORY_OPTIONS,
  defaultNatureForCategory,
  MONTHS_FR,
  NATURE_LABEL,
  NATURE_OPTIONS,
  STATUS_LABEL,
} from "~/app/dashboard/budgets/_lib/budget-constants";
import {
  canProposeBudget,
  isBudgetFinalApprover,
} from "~/app/dashboard/budgets/_lib/budget-workflow";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Skeleton } from "~/components/ui/skeleton";
import {
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { api } from "~/lib/api";
import { fetchOrganizations } from "~/lib/api-list";
import type {
  BudgetDto,
  BudgetLineCategoryDto,
  BudgetLineNatureDto,
  BudgetUserSummaryDto,
  OrganizationDto,
  PaginatedBudgetsDto,
} from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";
import { apiErrorMessage } from "~/lib/api-error-message";

type LineForm = {
  nature: BudgetLineNatureDto;
  category: BudgetLineCategoryDto;
  label: string;
  amountPlanned: string;
};

function emptyLine(): LineForm {
  return { nature: "FIXED", category: "LOYER", label: "", amountPlanned: "" };
}

function budgetTotalFcfa(b: BudgetDto): number {
  return b.lines.reduce(
    (s, l) => s + parseDecimal(l.amountPlanned),
    0,
  );
}

function budgetActorLabel(user: BudgetUserSummaryDto | null): string {
  if (!user) return "";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email;
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
  const canPropose =
    me != null && canProposeBudget(me, isMain) && (canCreateBudget || canUpdateBudget);
  const canApproveDir =
    me != null && isBudgetFinalApprover(me) && canUpdateBudget;

  const [subsidiaryId, setSubsidiaryId] = useState<string | null>(null);
  const [financeNote, setFinanceNote] = useState("");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ["budget"] as const,
    queryFn: async () => {
      const { data } = await api.get<PaginatedBudgetsDto>("/budget");
      return data.items;
    },
    enabled: Boolean(me && canReadBudget),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: fetchOrganizations,
    enabled: Boolean(
      me && isMain && (canCreateBudget || canUpdateBudget),
    ),
  });

  const subsidiaries = useMemo(
    () =>
      organizations.filter((o) => o.organizationType === "SUBSIDIARY"),
    [organizations],
  );

  const firstSubId = subsidiaries[0]?.id ?? "";
  const effectiveSubsidiaryId =
    subsidiaryId !== null ? subsidiaryId : firstSubId;

  type SaveBody = {
    subsidiaryOrganizationId: string;
    year: number;
    month: number;
    lines: {
      nature: BudgetLineNatureDto;
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

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/budget/${id}/submit`, {
        financeNote: financeNote.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setFinanceNote("");
      await queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Soumission impossible"));
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

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const rejectionReason = window.prompt("Motif du refus :");
      if (!rejectionReason?.trim()) {
        throw new Error("Motif requis");
      }
      await api.post(`/budget/${id}/reject`, {
        rejectionReason: rejectionReason.trim(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Refus impossible"));
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
        nature: l.nature,
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
        nature: row.nature,
        category: row.category,
        label: row.label.trim(),
        amountPlanned: amt,
      });
    }

    if (!editingId && !effectiveSubsidiaryId) {
      alert("Choisissez une filiale.");
      return;
    }

    saveMutation.mutate({
      editingBudgetId: editingId,
      body: {
        subsidiaryOrganizationId: effectiveSubsidiaryId,
        year,
        month,
        lines: parsedLines,
      },
    });
  }

  if (mePending || !me) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-4 h-40 w-full max-w-3xl rounded-xl" />
      </PageShell>
    );
  }

  if (!canReadBudget) {
    return (
      <PageShell>
        <PageHeader title="Budgets filiales" />
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Vous n’avez pas la permission de consulter les budgets.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={isMain ? "Finances" : "Budgets filiales"}
        description={
          isMain
            ? "Suivi des revenus et dépenses de vos filiales."
            : "Gérez vos charges fixes et variables sur le budget validé, ou demandez une rallonge à la maison mère."
        }
        actions={
          <Wallet className="size-8 shrink-0 text-primary" aria-hidden />
        }
      />

      <div className="mt-6 flex flex-col gap-6">
        {canPropose ? (
          <Card className="py-4">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg">
                {editingId ? "Modifier le brouillon" : "Proposition budgétaire (pôle finance)"}
              </CardTitle>
              <CardDescription>
                Définissez les lignes fixes (loyer, salaires, énergie…) et variables
                (stock, maintenance, matériel…) pour une filiale et une période mensuelle.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <form className="space-y-4" onSubmit={submitForm}>
                <div className="flex flex-wrap gap-4">
                  <div className="min-w-[200px] flex-1">
                    <Label htmlFor="budget-subsidiary">Filiale</Label>
                    <Select
                      value={
                        subsidiaryId !== null
                          ? subsidiaryId
                          : firstSubId || ""
                      }
                      onValueChange={setSubsidiaryId}
                      disabled={Boolean(editingId)}
                    >
                      <SelectTrigger id="budget-subsidiary" className="mt-1">
                        <SelectValue placeholder="— Choisir —" />
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
                  <div className="w-28">
                    <Label htmlFor="budget-year">Année</Label>
                    <Input
                      id="budget-year"
                      type="number"
                      min={2000}
                      max={2100}
                      disabled={Boolean(editingId)}
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div className="w-44">
                    <Label htmlFor="budget-month">Mois</Label>
                    <Select
                      value={String(month)}
                      onValueChange={(v) => setMonth(Number(v))}
                      disabled={Boolean(editingId)}
                    >
                      <SelectTrigger id="budget-month" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS_FR.map((label, i) => (
                          <SelectItem key={label} value={String(i + 1)}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Lignes budgétaires
                  </p>
                  {lines.map((row, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-3"
                    >
                      <div className="min-w-[120px]">
                        <Label className="text-xs">Nature</Label>
                        <Select
                          value={row.nature}
                          onValueChange={(v) => {
                            const nature = v as BudgetLineNatureDto;
                            setLines((prev) =>
                              prev.map((l, i) =>
                                i === idx ? { ...l, nature } : l,
                              ),
                            );
                          }}
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {NATURE_OPTIONS.map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-[140px]">
                        <Label className="text-xs">Catégorie</Label>
                        <Select
                          value={row.category}
                          onValueChange={(v) => {
                            const cat = v as BudgetLineCategoryDto;
                            setLines((prev) =>
                              prev.map((l, i) =>
                                i === idx
                                  ? {
                                      ...l,
                                      category: cat,
                                      nature: defaultNatureForCategory(cat),
                                    }
                                  : l,
                              ),
                            );
                          }}
                        >
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-[180px] flex-1">
                        <Label className="text-xs">Libellé</Label>
                        <Input
                          value={row.label}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l, i) =>
                                i === idx ? { ...l, label: e.target.value } : l,
                              ),
                            )
                          }
                          placeholder="ex. Loyer local centre-ville"
                          className="mt-1 h-9"
                        />
                      </div>
                      <div className="w-36">
                        <Label className="text-xs">Montant (FCFA)</Label>
                        <Input
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
                          className="mt-1 h-9 font-mono"
                        />
                      </div>
                      {lines.length > 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                          onClick={() =>
                            setLines((prev) => prev.filter((_, i) => i !== idx))
                          }
                          aria-label="Supprimer la ligne"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLines((prev) => [...prev, emptyLine()])}
                  >
                    <Plus className="size-4" />
                    Ajouter une ligne
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {editingId ? "Enregistrer les lignes" : "Créer le brouillon"}
                  </Button>
                  {editingId ? (
                    <Button type="button" variant="outline" onClick={cancelEdit}>
                      Annuler
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card className="py-4">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg">Liste des budgets</CardTitle>
            <CardDescription>
              Brouillons finance, propositions en attente DG / opérations, budgets validés.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {canPropose ? (
              <div className="mb-4 max-w-xl">
                <Label htmlFor="budget-finance-note">
                  Note finance (optionnelle, envoyée à la direction)
                </Label>
                <Input
                  id="budget-finance-note"
                  value={financeNote}
                  onChange={(e) => setFinanceNote(e.target.value)}
                  placeholder="Contexte ou recommandation pour la validation"
                  className="mt-1"
                />
              </div>
            ) : null}
            {budgetsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : budgets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun budget.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {isMain ? (
                        <th className="px-4 py-3 font-semibold">Filiale</th>
                      ) : null}
                      <th className="px-4 py-3 font-semibold">Période</th>
                      <th className="px-4 py-3 font-semibold">Statut</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Total (FCFA)
                      </th>
                      <th className="px-4 py-3 font-semibold">Lignes</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgets.map((b) => (
                      <tr
                        key={b.id}
                        className="border-b border-border/60 last:border-0 hover:bg-muted/30"
                      >
                        {isMain ? (
                          <td className="px-4 py-3 font-medium">
                            {b.subsidiaryOrganization.name}
                          </td>
                        ) : null}
                        <td className="whitespace-nowrap px-4 py-3">
                          {MONTHS_FR[b.month - 1]} {b.year}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <Badge
                              variant={
                                b.status === "APPROVED"
                                  ? "default"
                                  : b.status === "REJECTED"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className={
                                b.status === "APPROVED"
                                  ? "bg-emerald-600 text-white hover:bg-emerald-600/90"
                                  : undefined
                              }
                            >
                              {STATUS_LABEL[b.status]}
                            </Badge>
                            {b.financeNote ? (
                              <p className="text-xs text-muted-foreground">
                                Note : {b.financeNote}
                              </p>
                            ) : null}
                            {b.status === "REJECTED" && b.rejectionReason ? (
                              <p className="text-xs text-destructive">
                                {b.rejectionReason}
                              </p>
                            ) : null}
                            {b.submittedBy ? (
                              <p className="text-xs text-muted-foreground">
                                Soumis par {budgetActorLabel(b.submittedBy)}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium tabular-nums">
                          {formatFcfa(budgetTotalFcfa(b))}
                        </td>
                        <td className="max-w-md px-4 py-3 text-muted-foreground">
                          <ul className="list-inside list-disc text-xs">
                            {b.lines.map((l) => (
                              <li key={l.id}>
                                {NATURE_LABEL[l.nature]} · {CATEGORY_LABEL[l.category]} —{" "}
                                {l.label} : {formatFcfa(parseDecimal(l.amountPlanned))}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isMain &&
                          (b.status === "DRAFT" || b.status === "REJECTED") &&
                          canPropose ? (
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => startEdit(b)}
                              >
                                <Pencil className="size-3.5" />
                                Modifier
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => submitMutation.mutate(b.id)}
                                disabled={submitMutation.isPending}
                              >
                                Soumettre à la direction
                              </Button>
                              {canDeleteBudget ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
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
                                >
                                  Supprimer
                                </Button>
                              ) : null}
                            </div>
                          ) : isMain &&
                            b.status === "PENDING_APPROVAL" &&
                            canApproveDir ? (
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => approveMutation.mutate(b.id)}
                                disabled={approveMutation.isPending}
                              >
                                Approuver
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-destructive"
                                onClick={() => rejectMutation.mutate(b.id)}
                                disabled={rejectMutation.isPending}
                              >
                                Refuser
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <BudgetExpensesPanel
          budgets={budgets}
          canViewExpenses={canReadBudget}
          canRecordExpense={
            me != null &&
            hasMePermission(me, "create", "BudgetExpense") &&
            !isMain
          }
          isMain={isMain}
        />

        <BudgetSupplementPanel budgets={budgets} />

        <BudgetExpenseLedger />
      </div>
    </PageShell>
  );
}
