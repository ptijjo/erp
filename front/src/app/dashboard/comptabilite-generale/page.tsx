"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Pencil, Trash2 } from "lucide-react";

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
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type {
  ChartAccountDto,
  ChartAccountTypeDto,
  JournalEntryDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { useScopedOrganizations } from "~/lib/use-scoped-organizations";

const ACCOUNT_TYPE_OPTIONS = Object.entries(CHART_ACCOUNT_TYPE_LABEL) as [
  ChartAccountTypeDto,
  string,
][];

type TabId = "accounts" | "entries";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR");
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
  const canDeleteEntry =
    me != null && hasMePermission(me, "delete", "JournalEntry");

  const canRead = canReadAccounts || canReadEntries;
  const [tab, setTab] = useState<TabId>("accounts");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const formOrganizationId = organizationId || defaultOrganizationId;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<ChartAccountTypeDto>("EXPENSE");
  const [isActive, setIsActive] = useState(true);

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["accounting", "chart-accounts"] as const,
    queryFn: async () => {
      const { data } = await api.get<ChartAccountDto[]>(
        "/accounting/chart-accounts",
      );
      return data;
    },
    enabled: canReadAccounts,
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

  const resetForm = () => {
    setEditingId(null);
    setCode("");
    setName("");
    setAccountType("EXPENSE");
    setIsActive(true);
    setOrganizationId("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const orgId = main ? formOrganizationId : me!.organisationId;
      const body = {
        code: code.trim(),
        name: name.trim(),
        accountType,
        isActive,
      };
      if (editingId) {
        await api.patch(`/accounting/chart-accounts/${editingId}`, body);
      } else {
        await api.post("/accounting/chart-accounts", {
          organizationId: orgId,
          ...body,
        });
      }
    },
    onSuccess: async () => {
      resetForm();
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

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/accounting/journal-entries/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounting"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Suppression impossible"));
    },
  });

  function startEdit(row: ChartAccountDto) {
    setEditingId(row.id);
    setOrganizationId(row.organizationId);
    setCode(row.code);
    setName(row.name);
    setAccountType(row.accountType);
    setIsActive(row.isActive);
  }

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

  return (
    <PageShell>
      <PageHeader
        title="Comptabilité générale"
        description="Plan comptable et écritures de journal."
      />

      <div className="mt-6 flex gap-2">
        {canReadAccounts ? (
          <Button
            variant={tab === "accounts" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("accounts")}
          >
            Plan comptable
          </Button>
        ) : null}
        {canReadEntries ? (
          <Button
            variant={tab === "entries" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("entries")}
          >
            Écritures
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
                  {editingId ? "Modifier le compte" : "Nouveau compte"}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {main && !editingId ? (
                  <OrganizationSelectField
                    id="account-org"
                    label="Organisation"
                    organizations={selectableOrgs}
                    value={formOrganizationId}
                    onChange={setOrganizationId}
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
                      !code.trim() ||
                      !name.trim() ||
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
                Comptes ({accounts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun compte.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="pb-2 pr-4">Code</th>
                        <th className="pb-2 pr-4">Libellé</th>
                        <th className="pb-2 pr-4">Organisation</th>
                        <th className="pb-2 pr-4">Type</th>
                        <th className="pb-2 pr-4">Actif</th>
                        <th className="pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {accounts.map((row) => (
                        <tr key={row.id}>
                          <td className="py-2 pr-4 font-mono">{row.code}</td>
                          <td className="py-2 pr-4 font-medium">{row.name}</td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {orgName(row.organizationId)}
                          </td>
                          <td className="py-2 pr-4">
                            {CHART_ACCOUNT_TYPE_LABEL[row.accountType]}
                          </td>
                          <td className="py-2 pr-4">
                            {row.isActive ? "Oui" : "Non"}
                          </td>
                          <td className="py-2">
                            <div className="flex gap-1">
                              {canUpdateAccount ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Modifier"
                                  onClick={() => startEdit(row)}
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {tab === "entries" && canReadEntries ? (
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4">Référence</th>
                      <th className="pb-2 pr-4">Organisation</th>
                      <th className="pb-2 pr-4">Lignes</th>
                      <th className="pb-2 pr-4">Statut</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entries.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2 pr-4">
                          {formatDate(row.entryDate)}
                        </td>
                        <td className="py-2 pr-4">
                          {row.reference ?? "—"}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {orgName(row.organizationId)}
                        </td>
                        <td className="py-2 pr-4">{row.lines.length}</td>
                        <td className="py-2 pr-4">
                          <Badge variant="secondary">
                            {JOURNAL_ENTRY_STATUS_LABEL[row.status]}
                          </Badge>
                        </td>
                        <td className="py-2">
                          {canDeleteEntry && row.status === "DRAFT" ? (
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </PageShell>
  );
}
