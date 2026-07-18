"use client";

import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Minus,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";

import { OrganizationSelectField } from "~/app/dashboard/_components/OrganizationSelectField";
import {
  CHART_ACCOUNT_TYPE_LABEL,
  JOURNAL_ENTRY_STATUS_LABEL,
} from "~/app/dashboard/_lib/pole-status-labels";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type {
  ChartAccountDto,
  ChartAccountTypeDto,
  GeneralLedgerDto,
  JournalEntryDto,
  TrialBalanceDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import {
  formatDisplayDate,
  toDateInputValue,
} from "~/lib/date-input";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";
import { useScopedOrganizations } from "~/lib/use-scoped-organizations";

const ACCOUNT_TYPE_OPTIONS = Object.entries(CHART_ACCOUNT_TYPE_LABEL) as [
  ChartAccountTypeDto,
  string,
][];

const MONTH_OPTIONS = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
] as const;

const NO_PARENT_VALUE = "__none__";

type TabId = "accounts" | "entries" | "reports";

type EntryLineForm = {
  chartAccountId: string;
  label: string;
  debit: string;
  credit: string;
};

function emptyEntryLine(): EntryLineForm {
  return { chartAccountId: "", label: "", debit: "", credit: "" };
}

function defaultEntryLines(): EntryLineForm[] {
  return [emptyEntryLine(), emptyEntryLine()];
}

function parseLineAmount(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  return parseDecimal(trimmed);
}

function sumEntryLines(lines: EntryLineForm[]) {
  let debitTotal = 0;
  let creditTotal = 0;
  for (const line of lines) {
    debitTotal += parseLineAmount(line.debit);
    creditTotal += parseLineAmount(line.credit);
  }
  return { debitTotal, creditTotal };
}

function isLinesBalanced(lines: EntryLineForm[]) {
  const { debitTotal, creditTotal } = sumEntryLines(lines);
  return Math.abs(debitTotal - creditTotal) < 0.0001;
}

function accountLabel(account: ChartAccountDto) {
  return `${account.code} — ${account.name}`;
}

export default function ComptabiliteGeneralePage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { main, selectableOrgs, defaultOrganizationId } =
    useScopedOrganizations();

  const canReadAccounts =
    me != null && hasMePermission(me, "read", "ChartAccount");
  const canCreateAccount =
    me != null && hasMePermission(me, "create", "ChartAccount");
  const canUpdateAccount =
    me != null && hasMePermission(me, "update", "ChartAccount");
  const canDeleteAccount =
    me != null && hasMePermission(me, "delete", "ChartAccount");
  const canReadEntries =
    me != null && hasMePermission(me, "read", "JournalEntry");
  const canCreateEntry =
    me != null && hasMePermission(me, "create", "JournalEntry");
  const canUpdateEntry =
    me != null && hasMePermission(me, "update", "JournalEntry");
  const canDeleteEntry =
    me != null && hasMePermission(me, "delete", "JournalEntry");
  const canPostEntry =
    me != null && hasMePermission(me, "manage", "JournalEntry");

  const canRead = canReadAccounts || canReadEntries;
  const defaultTab: TabId = canReadAccounts
    ? "accounts"
    : canReadEntries
      ? "entries"
      : "reports";
  const [tab, setTab] = useState<TabId>(defaultTab);

  // —— Plan comptable ——
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountOrganizationId, setAccountOrganizationId] = useState("");
  const accountFormOrgId = accountOrganizationId || defaultOrganizationId;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] =
    useState<ChartAccountTypeDto>("EXPENSE");
  const [isActive, setIsActive] = useState(true);
  const [parentId, setParentId] = useState<string | null>(null);

  // —— Écritures ——
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryOrganizationId, setEntryOrganizationId] = useState("");
  const entryFormOrgId = entryOrganizationId || defaultOrganizationId;
  const [entryDate, setEntryDate] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [entryLines, setEntryLines] = useState<EntryLineForm[]>(
    defaultEntryLines,
  );
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // —— Rapports ——
  const now = new Date();
  const [trialYear, setTrialYear] = useState(String(now.getFullYear()));
  const [trialMonth, setTrialMonth] = useState(String(now.getMonth() + 1));
  const [trialOrganizationId, setTrialOrganizationId] = useState("");
  const trialFormOrgId = trialOrganizationId || defaultOrganizationId;
  const [trialParams, setTrialParams] = useState<{
    year: number;
    month: number;
    organizationId?: string;
  } | null>(null);

  const [ledgerAccountId, setLedgerAccountId] = useState("");
  const [ledgerFrom, setLedgerFrom] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return toDateInputValue(d);
  });
  const [ledgerTo, setLedgerTo] = useState(() => toDateInputValue(now));
  const [ledgerParams, setLedgerParams] = useState<{
    chartAccountId: string;
    from: string;
    to: string;
  } | null>(null);

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["accounting", "chart-accounts"] as const,
    queryFn: async () => {
      const { data } = await api.get<ChartAccountDto[]>(
        "/accounting/chart-accounts",
      );
      return data;
    },
    enabled:
      canReadAccounts ||
      canCreateEntry ||
      canUpdateEntry ||
      (canReadEntries && tab === "reports"),
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["accounting", "journal-entries"] as const,
    queryFn: async () => {
      const { data } = await api.get<JournalEntryDto[]>(
        "/accounting/journal-entries",
      );
      return data;
    },
    enabled: canReadEntries,
  });

  const accountById = useMemo(() => {
    const map = new Map<string, ChartAccountDto>();
    for (const a of accounts) map.set(a.id, a);
    return map;
  }, [accounts]);

  const parentCandidates = useMemo(() => {
    const orgId = editingAccountId
      ? accounts.find((a) => a.id === editingAccountId)?.organizationId
      : accountFormOrgId;
    if (!orgId) return [];
    return accounts.filter(
      (a) => a.organizationId === orgId && a.id !== editingAccountId,
    );
  }, [accounts, accountFormOrgId, editingAccountId]);

  const entryAccountCandidates = useMemo(() => {
    const orgId = editingEntryId
      ? entries.find((e) => e.id === editingEntryId)?.organizationId
      : entryFormOrgId;
    if (!orgId) return accounts;
    return accounts.filter((a) => a.organizationId === orgId);
  }, [accounts, entries, entryFormOrgId, editingEntryId]);

  const { debitTotal, creditTotal } = sumEntryLines(entryLines);
  const linesBalanced = isLinesBalanced(entryLines);

  const resetAccountForm = () => {
    setEditingAccountId(null);
    setCode("");
    setName("");
    setAccountType("EXPENSE");
    setIsActive(true);
    setParentId(null);
    setAccountOrganizationId("");
  };

  const resetEntryForm = () => {
    setEditingEntryId(null);
    setEntryDate(toDateInputValue(new Date()));
    setReference("");
    setDescription("");
    setEntryLines(defaultEntryLines());
    setEntryOrganizationId("");
  };

  const saveAccountMutation = useMutation({
    mutationFn: async () => {
      const orgId = main ? accountFormOrgId : me!.organisationId;
      const body = {
        code: code.trim(),
        name: name.trim(),
        accountType,
        isActive,
        parentId,
      };
      if (editingAccountId) {
        await api.patch(`/accounting/chart-accounts/${editingAccountId}`, body);
      } else {
        await api.post("/accounting/chart-accounts", {
          organizationId: orgId,
          ...body,
        });
      }
    },
    onSuccess: async () => {
      resetAccountForm();
      await queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Enregistrement impossible"));
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/accounting/chart-accounts/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Suppression impossible"));
    },
  });

  const saveEntryMutation = useMutation({
    mutationFn: async () => {
      const lines = entryLines.map((l) => ({
        chartAccountId: l.chartAccountId,
        label: l.label.trim() || undefined,
        debit: parseLineAmount(l.debit),
        credit: parseLineAmount(l.credit),
      }));
      const body = {
        entryDate,
        reference: reference.trim() || undefined,
        description: description.trim() || undefined,
        lines,
      };
      if (editingEntryId) {
        await api.patch(`/accounting/journal-entries/${editingEntryId}`, body);
      } else {
        const orgId = main ? entryFormOrgId : me!.organisationId;
        await api.post("/accounting/journal-entries", {
          organizationId: orgId,
          ...body,
        });
      }
    },
    onSuccess: async () => {
      resetEntryForm();
      await queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Enregistrement impossible"));
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/accounting/journal-entries/${id}`);
    },
    onSuccess: async () => {
      if (expandedEntryId) setExpandedEntryId(null);
      await queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Suppression impossible"));
    },
  });

  const postEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/accounting/journal-entries/${id}/post`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Validation impossible"));
    },
  });

  const {
    data: trialBalance,
    isLoading: trialLoading,
    isFetching: trialFetching,
    error: trialError,
  } = useQuery({
    queryKey: ["accounting", "trial-balance", trialParams] as const,
    queryFn: async () => {
      const { data } = await api.get<TrialBalanceDto>(
        "/accounting/reports/trial-balance",
        {
          params: {
            year: trialParams!.year,
            month: trialParams!.month,
            organizationId: trialParams!.organizationId,
          },
        },
      );
      return data;
    },
    enabled:
      trialParams != null &&
      (!main || Boolean(trialParams.organizationId)),
  });

  const {
    data: generalLedger,
    isLoading: ledgerLoading,
    isFetching: ledgerFetching,
    error: ledgerError,
  } = useQuery({
    queryKey: ["accounting", "general-ledger", ledgerParams] as const,
    queryFn: async () => {
      const { data } = await api.get<GeneralLedgerDto>(
        "/accounting/reports/general-ledger",
        { params: ledgerParams! },
      );
      return data;
    },
    enabled:
      ledgerParams != null &&
      Boolean(ledgerParams.chartAccountId) &&
      Boolean(ledgerParams.from) &&
      Boolean(ledgerParams.to),
  });

  function startEditAccount(row: ChartAccountDto) {
    setEditingAccountId(row.id);
    setAccountOrganizationId(row.organizationId);
    setCode(row.code);
    setName(row.name);
    setAccountType(row.accountType);
    setIsActive(row.isActive);
    setParentId(row.parentId);
  }

  function startEditEntry(row: JournalEntryDto) {
    setEditingEntryId(row.id);
    setEntryOrganizationId(row.organizationId);
    setEntryDate(toDateInputValue(row.entryDate));
    setReference(row.reference ?? "");
    setDescription(row.description ?? "");
    setEntryLines(
      row.lines.map((l) => ({
        chartAccountId: l.chartAccountId,
        label: l.label ?? "",
        debit: parseDecimal(l.debit) > 0 ? String(parseDecimal(l.debit)) : "",
        credit:
          parseDecimal(l.credit) > 0 ? String(parseDecimal(l.credit)) : "",
      })),
    );
  }

  function updateEntryLine(index: number, patch: Partial<EntryLineForm>) {
    setEntryLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  function addEntryLine() {
    setEntryLines((prev) => [...prev, emptyEntryLine()]);
  }

  function removeEntryLine(index: number) {
    setEntryLines((prev) =>
      prev.length <= 2 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  const entryFormValid =
    entryDate.trim() !== "" &&
    entryLines.length >= 2 &&
    entryLines.every(
      (l) =>
        l.chartAccountId !== "" &&
        (parseLineAmount(l.debit) > 0 || parseLineAmount(l.credit) > 0),
    ) &&
    linesBalanced &&
    (!main || editingEntryId != null || Boolean(entryFormOrgId));

  const accountFormValid =
    code.trim() !== "" &&
    name.trim() !== "" &&
    (!main || editingAccountId != null || Boolean(accountFormOrgId));

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Comptabilité générale"
          description="Vous n'avez pas accès à la comptabilité générale."
        />
      </PageShell>
    );
  }

  const orgName = (id: string) =>
    selectableOrgs.find((o) => o.id === id)?.name ?? id.slice(0, 8);

  const parentCode = (id: string | null) => {
    if (!id) return "—";
    return accountById.get(id)?.code ?? id.slice(0, 8);
  };

  return (
    <PageShell>
      <PageHeader
        title="Comptabilité générale"
        description="Plan comptable, écritures de journal et rapports."
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {canReadAccounts ? (
          <Button
            variant={tab === "accounts" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("accounts")}
          >
            <BookOpen className="mr-1.5 size-4" />
            Plan comptable
          </Button>
        ) : null}
        {canReadEntries ? (
          <Button
            variant={tab === "entries" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("entries")}
          >
            <FileText className="mr-1.5 size-4" />
            Écritures
          </Button>
        ) : null}
        {canReadEntries ? (
          <Button
            variant={tab === "reports" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("reports")}
          >
            <BarChart3 className="mr-1.5 size-4" />
            Rapports
          </Button>
        ) : null}
      </div>

      {tab === "accounts" && canReadAccounts ? (
        <>
          {(canCreateAccount || canUpdateAccount) && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="size-4" />
                  {editingAccountId ? "Modifier le compte" : "Nouveau compte"}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {main && !editingAccountId ? (
                  <OrganizationSelectField
                    id="account-org"
                    label="Organisation"
                    organizations={selectableOrgs}
                    value={accountFormOrgId}
                    onChange={setAccountOrganizationId}
                  />
                ) : null}
                <div>
                  <Label htmlFor="account-code">Code</Label>
                  <Input
                    id="account-code"
                    className="mt-1"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="account-name">Libellé</Label>
                  <Input
                    id="account-name"
                    className="mt-1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={accountType}
                    onValueChange={(v) =>
                      setAccountType(v as ChartAccountTypeDto)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPE_OPTIONS.map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Compte parent</Label>
                  <Select
                    value={parentId ?? NO_PARENT_VALUE}
                    onValueChange={(v) =>
                      setParentId(v === NO_PARENT_VALUE ? null : v)
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PARENT_VALUE}>Aucun</SelectItem>
                      {parentCandidates.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {accountLabel(a)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Actif</Label>
                  <Select
                    value={isActive ? "yes" : "no"}
                    onValueChange={(v) => setIsActive(v === "yes")}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Oui</SelectItem>
                      <SelectItem value="no">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <Button
                    disabled={
                      !accountFormValid || saveAccountMutation.isPending
                    }
                    onClick={() => saveAccountMutation.mutate()}
                  >
                    {editingAccountId ? "Enregistrer" : "Créer"}
                  </Button>
                  {editingAccountId ? (
                    <Button variant="outline" onClick={resetAccountForm}>
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
                Comptes ({accounts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun compte.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Organisation</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actif</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono">{row.code}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {parentCode(row.parentId)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {orgName(row.organizationId)}
                        </TableCell>
                        <TableCell>
                          {CHART_ACCOUNT_TYPE_LABEL[row.accountType]}
                        </TableCell>
                        <TableCell>{row.isActive ? "Oui" : "Non"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canUpdateAccount ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="Modifier"
                                onClick={() => startEditAccount(row)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                            ) : null}
                            {canDeleteAccount ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label="Supprimer"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Supprimer le compte « ${row.code} » ?`,
                                    )
                                  ) {
                                    deleteAccountMutation.mutate(row.id);
                                  }
                                }}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {tab === "entries" && canReadEntries ? (
        <>
          {(canCreateEntry || canUpdateEntry) && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4" />
                  {editingEntryId
                    ? "Modifier l'écriture (brouillon)"
                    : "Nouvelle écriture"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {main && !editingEntryId ? (
                    <OrganizationSelectField
                      id="entry-org"
                      label="Organisation"
                      organizations={selectableOrgs}
                      value={entryFormOrgId}
                      onChange={setEntryOrganizationId}
                    />
                  ) : null}
                  <div>
                    <Label htmlFor="entry-date">Date</Label>
                    <Input
                      id="entry-date"
                      type="date"
                      className="mt-1"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="entry-reference">Référence</Label>
                    <Input
                      id="entry-reference"
                      className="mt-1"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="entry-description">Description</Label>
                    <Input
                      id="entry-description"
                      className="mt-1"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label>Lignes d&apos;écriture</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEntryLine}
                    >
                      <Plus className="mr-1 size-4" />
                      Ajouter une ligne
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {entryLines.map((line, index) => (
                      <div
                        key={index}
                        className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_minmax(0,7rem)_minmax(0,7rem)_auto]"
                      >
                        <div>
                          <Label className="text-xs">Compte</Label>
                          <Select
                            value={line.chartAccountId || undefined}
                            onValueChange={(v) =>
                              updateEntryLine(index, { chartAccountId: v })
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                            <SelectContent>
                              {entryAccountCandidates.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {accountLabel(a)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Libellé</Label>
                          <Input
                            className="mt-1"
                            value={line.label}
                            onChange={(e) =>
                              updateEntryLine(index, { label: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Débit</Label>
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            className="mt-1"
                            value={line.debit}
                            onChange={(e) =>
                              updateEntryLine(index, { debit: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Crédit</Label>
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            className="mt-1"
                            value={line.credit}
                            onChange={(e) =>
                              updateEntryLine(index, { credit: e.target.value })
                            }
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Supprimer la ligne"
                            disabled={entryLines.length <= 2}
                            onClick={() => removeEntryLine(index)}
                          >
                            <Minus className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                    <span>
                      Total débit :{" "}
                      <strong>{formatFcfa(debitTotal)}</strong>
                    </span>
                    <span>
                      Total crédit :{" "}
                      <strong>{formatFcfa(creditTotal)}</strong>
                    </span>
                    {!linesBalanced ? (
                      <span className="text-destructive">
                        Les totaux ne sont pas équilibrés.
                      </span>
                    ) : (
                      <span className="text-green-700">Écriture équilibrée.</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    disabled={!entryFormValid || saveEntryMutation.isPending}
                    onClick={() => saveEntryMutation.mutate()}
                  >
                    {editingEntryId ? "Enregistrer" : "Créer le brouillon"}
                  </Button>
                  {editingEntryId ? (
                    <Button variant="outline" onClick={resetEntryForm}>
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
                Écritures ({entries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {entriesLoading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune écriture enregistrée.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Date</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Organisation</TableHead>
                      <TableHead>Lignes</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((row) => {
                      const isExpanded = expandedEntryId === row.id;
                      const isDraft = row.status === "DRAFT";
                      return (
                        <Fragment key={row.id}>
                          <TableRow>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={
                                  isExpanded
                                    ? "Masquer les lignes"
                                    : "Afficher les lignes"
                                }
                                onClick={() =>
                                  setExpandedEntryId(
                                    isExpanded ? null : row.id,
                                  )
                                }
                              >
                                {isExpanded ? (
                                  <ChevronUp className="size-4" />
                                ) : (
                                  <ChevronDown className="size-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              {formatDisplayDate(row.entryDate)}
                            </TableCell>
                            <TableCell>{row.reference ?? "—"}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {row.description ?? "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {orgName(row.organizationId)}
                            </TableCell>
                            <TableCell>{row.lines.length}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {JOURNAL_ENTRY_STATUS_LABEL[row.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {canUpdateEntry && isDraft ? (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Modifier"
                                    onClick={() => startEditEntry(row)}
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                ) : null}
                                {canPostEntry && isDraft ? (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Valider (poster)"
                                    disabled={postEntryMutation.isPending}
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "Valider cette écriture ? Elle ne pourra plus être modifiée.",
                                        )
                                      ) {
                                        postEntryMutation.mutate(row.id);
                                      }
                                    }}
                                  >
                                    <Send className="size-4 text-green-700" />
                                  </Button>
                                ) : null}
                                {canDeleteEntry && isDraft ? (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Supprimer"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "Supprimer cette écriture brouillon ?",
                                        )
                                      ) {
                                        deleteEntryMutation.mutate(row.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="size-4 text-destructive" />
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded ? (
                            <TableRow key={`${row.id}-lines`}>
                              <TableCell colSpan={8} className="bg-muted/30">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Compte</TableHead>
                                      <TableHead>Libellé</TableHead>
                                      <TableHead className="text-right">
                                        Débit
                                      </TableHead>
                                      <TableHead className="text-right">
                                        Crédit
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {row.lines.map((line) => {
                                      const acc =
                                        line.chartAccount ??
                                        accountById.get(line.chartAccountId);
                                      const accLabel = acc
                                        ? `${acc.code} — ${acc.name}`
                                        : line.chartAccountId.slice(0, 8);
                                      return (
                                        <TableRow key={line.id}>
                                          <TableCell className="font-mono text-xs">
                                            {accLabel}
                                          </TableCell>
                                          <TableCell>
                                            {line.label ?? "—"}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {parseDecimal(line.debit) > 0
                                              ? formatFcfa(
                                                  parseDecimal(line.debit),
                                                )
                                              : "—"}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {parseDecimal(line.credit) > 0
                                              ? formatFcfa(
                                                  parseDecimal(line.credit),
                                                )
                                              : "—"}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {tab === "reports" && canReadEntries ? (
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Balance des comptes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="trial-year">Année</Label>
                  <Input
                    id="trial-year"
                    type="number"
                    min={2000}
                    max={2100}
                    className="mt-1"
                    value={trialYear}
                    onChange={(e) => setTrialYear(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Mois</Label>
                  <Select
                    value={trialMonth}
                    onValueChange={setTrialMonth}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {main ? (
                  <OrganizationSelectField
                    id="trial-org"
                    label="Organisation"
                    organizations={selectableOrgs}
                    value={trialFormOrgId}
                    onChange={setTrialOrganizationId}
                  />
                ) : null}
                <div className="flex items-end">
                  <Button
                    disabled={
                      main
                        ? !trialFormOrgId
                        : !Number(trialYear) || !Number(trialMonth)
                    }
                    onClick={() => {
                      setTrialParams({
                        year: Number(trialYear),
                        month: Number(trialMonth),
                        organizationId: main ? trialFormOrgId : undefined,
                      });
                    }}
                  >
                    Générer
                  </Button>
                </div>
              </div>

              {trialError ? (
                <p className="text-sm text-destructive">
                  {apiErrorMessage(trialError, "Impossible de charger la balance")}
                </p>
              ) : null}

              {trialLoading || trialFetching ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : null}

              {trialBalance && !trialFetching ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Période :{" "}
                    {MONTH_OPTIONS.find((m) => m.value === trialBalance.month)
                      ?.label ?? trialBalance.month}{" "}
                    {trialBalance.year} — {orgName(trialBalance.organizationId)}
                  </p>
                  {trialBalance.rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun mouvement sur cette période.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Libellé</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Débit</TableHead>
                          <TableHead className="text-right">Crédit</TableHead>
                          <TableHead className="text-right">Solde</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trialBalance.rows.map((r) => (
                          <TableRow key={r.chartAccountId}>
                            <TableCell className="font-mono">{r.code}</TableCell>
                            <TableCell>{r.name}</TableCell>
                            <TableCell>
                              {CHART_ACCOUNT_TYPE_LABEL[r.accountType]}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatFcfa(r.debit)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatFcfa(r.credit)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatFcfa(r.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold">
                          <TableCell colSpan={3}>Totaux</TableCell>
                          <TableCell className="text-right">
                            {formatFcfa(trialBalance.totals.debit)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatFcfa(trialBalance.totals.credit)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grand livre</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Compte</Label>
                  <Select
                    value={ledgerAccountId || undefined}
                    onValueChange={setLedgerAccountId}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choisir un compte" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {accountLabel(a)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ledger-from">Du</Label>
                  <Input
                    id="ledger-from"
                    type="date"
                    className="mt-1"
                    value={ledgerFrom}
                    onChange={(e) => setLedgerFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="ledger-to">Au</Label>
                  <Input
                    id="ledger-to"
                    type="date"
                    className="mt-1"
                    value={ledgerTo}
                    onChange={(e) => setLedgerTo(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    disabled={
                      !ledgerAccountId || !ledgerFrom || !ledgerTo
                    }
                    onClick={() => {
                      setLedgerParams({
                        chartAccountId: ledgerAccountId,
                        from: ledgerFrom,
                        to: ledgerTo,
                      });
                    }}
                  >
                    Générer
                  </Button>
                </div>
              </div>

              {ledgerError ? (
                <p className="text-sm text-destructive">
                  {apiErrorMessage(
                    ledgerError,
                    "Impossible de charger le grand livre",
                  )}
                </p>
              ) : null}

              {ledgerLoading || ledgerFetching ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : null}

              {generalLedger && !ledgerFetching ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {generalLedger.account.code} — {generalLedger.account.name}{" "}
                    ({CHART_ACCOUNT_TYPE_LABEL[generalLedger.account.accountType]}
                    ) — du {formatDisplayDate(generalLedger.from)} au{" "}
                    {formatDisplayDate(generalLedger.to)}
                  </p>
                  {generalLedger.movements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun mouvement sur cette période.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Référence</TableHead>
                          <TableHead>Libellé</TableHead>
                          <TableHead className="text-right">Débit</TableHead>
                          <TableHead className="text-right">Crédit</TableHead>
                          <TableHead className="text-right">Solde</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {generalLedger.movements.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell>
                              {formatDisplayDate(m.entry.entryDate)}
                            </TableCell>
                            <TableCell>
                              {m.entry.reference ?? "—"}
                            </TableCell>
                            <TableCell>{m.label ?? m.entry.description ?? "—"}</TableCell>
                            <TableCell className="text-right">
                              {m.debit > 0 ? formatFcfa(m.debit) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {m.credit > 0 ? formatFcfa(m.credit) : "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatFcfa(m.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold">
                          <TableCell colSpan={5}>Solde de clôture</TableCell>
                          <TableCell className="text-right">
                            {formatFcfa(generalLedger.closingBalance)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PageShell>
  );
}
