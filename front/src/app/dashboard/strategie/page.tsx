"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Target, Trash2 } from "lucide-react";

import { OrganizationSelectField } from "~/app/dashboard/_components/OrganizationSelectField";
import { STRATEGY_STATUS_LABEL } from "~/app/dashboard/_lib/pole-status-labels";
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
  StrategyProjectDto,
  StrategyProjectStatusDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { toDateInputValue } from "~/lib/date-input";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";
import { useScopedOrganizations } from "~/lib/use-scoped-organizations";

const STATUS_OPTIONS = Object.entries(STRATEGY_STATUS_LABEL) as [
  StrategyProjectStatusDto,
  string,
][];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default function StrategiePage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { main, selectableOrgs, defaultOrganizationId } =
    useScopedOrganizations();

  const canRead =
    me != null && hasMePermission(me, "read", "StrategyProject");
  const canCreate =
    me != null && hasMePermission(me, "create", "StrategyProject");
  const canUpdate =
    me != null && hasMePermission(me, "update", "StrategyProject");
  const canDelete =
    me != null && hasMePermission(me, "delete", "StrategyProject");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const formOrganizationId = organizationId || defaultOrganizationId;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<StrategyProjectStatusDto>("PLANNED");
  const [priority, setPriority] = useState("3");
  const [targetDate, setTargetDate] = useState("");
  const [budgetEstimate, setBudgetEstimate] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["strategy", "projects"] as const,
    queryFn: async () => {
      const { data } = await api.get<StrategyProjectDto[]>(
        "/strategy/projects",
      );
      return data;
    },
    enabled: canRead,
  });

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setStatus("PLANNED");
    setPriority("3");
    setTargetDate("");
    setBudgetEstimate("");
    setOrganizationId("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const orgId = main ? formOrganizationId : me!.organisationId;
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority: Number.parseInt(priority, 10) || 3,
        targetDate: targetDate || undefined,
        budgetEstimate: budgetEstimate.trim()
          ? parseDecimal(budgetEstimate)
          : undefined,
      };
      if (editingId) {
        await api.patch(`/strategy/projects/${editingId}`, body);
      } else {
        await api.post("/strategy/projects", {
          organizationId: orgId,
          ...body,
        });
      }
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["strategy"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Enregistrement impossible"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/strategy/projects/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["strategy"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Suppression impossible"));
    },
  });

  function startEdit(row: StrategyProjectDto) {
    setEditingId(row.id);
    setOrganizationId(row.organizationId);
    setTitle(row.title);
    setDescription(row.description ?? "");
    setStatus(row.status);
    setPriority(String(row.priority));
    setTargetDate(toDateInputValue(row.targetDate));
    setBudgetEstimate(row.budgetEstimate ?? "");
  }

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Stratégie"
          description="Vous n'avez pas accès aux projets stratégiques."
        />
      </PageShell>
    );
  }

  const orgName = (id: string) =>
    selectableOrgs.find((o) => o.id === id)?.name ?? id.slice(0, 8);

  return (
    <PageShell>
      <PageHeader
        title="Stratégie"
        description="Projets stratégiques et développement."
      />

      {(canCreate || canUpdate) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4" />
              {editingId ? "Modifier le projet" : "Nouveau projet stratégique"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {main && !editingId ? (
              <OrganizationSelectField
                id="strategy-org"
                label="Organisation"
                organizations={selectableOrgs}
                value={formOrganizationId}
                onChange={setOrganizationId}
              />
            ) : null}
            <div>
              <Label htmlFor="strategy-title">Titre</Label>
              <Input
                id="strategy-title"
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="strategy-priority">Priorité (1–5)</Label>
              <Input
                id="strategy-priority"
                type="number"
                min={1}
                max={5}
                className="mt-1"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="strategy-target">Date cible</Label>
              <Input
                id="strategy-target"
                type="date"
                className="mt-1"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="strategy-budget">Budget estimé (FCFA)</Label>
              <Input
                id="strategy-budget"
                className="mt-1"
                value={budgetEstimate}
                onChange={(e) => setBudgetEstimate(e.target.value)}
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as StrategyProjectStatusDto)}
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
              <Label htmlFor="strategy-desc">Description</Label>
              <textarea
                id="strategy-desc"
                className="mt-1 w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                disabled={
                  !title.trim() ||
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
            Projets ({projects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun projet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Titre</th>
                    <th className="pb-2 pr-4">Organisation</th>
                    <th className="pb-2 pr-4">Priorité</th>
                    <th className="pb-2 pr-4">Date cible</th>
                    <th className="pb-2 pr-4">Budget</th>
                    <th className="pb-2 pr-4">Statut</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 font-medium">{row.title}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {orgName(row.organizationId)}
                      </td>
                      <td className="py-2 pr-4">{row.priority}</td>
                      <td className="py-2 pr-4">
                        {formatDate(row.targetDate)}
                      </td>
                      <td className="py-2 pr-4">
                        {row.budgetEstimate
                          ? formatFcfa(Number(row.budgetEstimate))
                          : "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary">
                          {STRATEGY_STATUS_LABEL[row.status]}
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
