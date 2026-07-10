"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Pencil, Trash2 } from "lucide-react";

import { OrganizationSelectField } from "~/app/dashboard/_components/OrganizationSelectField";
import { MARKETING_STATUS_LABEL } from "~/app/dashboard/_lib/pole-status-labels";
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
  MarketingCampaignDto,
  MarketingCampaignStatusDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { toDateInputValue } from "~/lib/date-input";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";
import { useScopedOrganizations } from "~/lib/use-scoped-organizations";

const STATUS_OPTIONS = Object.entries(MARKETING_STATUS_LABEL) as [
  MarketingCampaignStatusDto,
  string,
][];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default function MarketingPage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { main, selectableOrgs, defaultOrganizationId } =
    useScopedOrganizations();

  const canRead =
    me != null && hasMePermission(me, "read", "MarketingCampaign");
  const canCreate =
    me != null && hasMePermission(me, "create", "MarketingCampaign");
  const canUpdate =
    me != null && hasMePermission(me, "update", "MarketingCampaign");
  const canDelete =
    me != null && hasMePermission(me, "delete", "MarketingCampaign");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const formOrganizationId = organizationId || defaultOrganizationId;
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<MarketingCampaignStatusDto>("DRAFT");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["marketing", "campaigns"] as const,
    queryFn: async () => {
      const { data } = await api.get<MarketingCampaignDto[]>(
        "/marketing/campaigns",
      );
      return data;
    },
    enabled: canRead,
  });

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setChannel("");
    setDescription("");
    setStatus("DRAFT");
    setStartDate("");
    setEndDate("");
    setBudget("");
    setOrganizationId("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const orgId = main ? formOrganizationId : me!.organisationId;
      const body = {
        title: title.trim(),
        channel: channel.trim(),
        description: description.trim() || undefined,
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        budget: budget.trim() ? parseDecimal(budget) : undefined,
      };
      if (editingId) {
        await api.patch(`/marketing/campaigns/${editingId}`, body);
      } else {
        await api.post("/marketing/campaigns", {
          organizationId: orgId,
          ...body,
        });
      }
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["marketing"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Enregistrement impossible"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/marketing/campaigns/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["marketing"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Suppression impossible"));
    },
  });

  function startEdit(row: MarketingCampaignDto) {
    setEditingId(row.id);
    setOrganizationId(row.organizationId);
    setTitle(row.title);
    setChannel(row.channel);
    setDescription(row.description ?? "");
    setStatus(row.status);
    setStartDate(toDateInputValue(row.startDate));
    setEndDate(toDateInputValue(row.endDate));
    setBudget(row.budget ?? "");
  }

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Marketing"
          description="Vous n'avez pas accès aux campagnes marketing."
        />
      </PageShell>
    );
  }

  const orgName = (id: string) =>
    selectableOrgs.find((o) => o.id === id)?.name ?? id.slice(0, 8);

  return (
    <PageShell>
      <PageHeader
        title="Marketing"
        description="Campagnes et actions de communication."
      />

      {(canCreate || canUpdate) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="size-4" />
              {editingId ? "Modifier la campagne" : "Nouvelle campagne"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {main && !editingId ? (
              <OrganizationSelectField
                id="marketing-org"
                label="Organisation"
                organizations={selectableOrgs}
                value={formOrganizationId}
                onChange={setOrganizationId}
              />
            ) : null}
            <div>
              <Label htmlFor="marketing-title">Titre</Label>
              <Input
                id="marketing-title"
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="marketing-channel">Canal</Label>
              <Input
                id="marketing-channel"
                className="mt-1"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="marketing-start">Date de début</Label>
              <Input
                id="marketing-start"
                type="date"
                className="mt-1"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="marketing-end">Date de fin</Label>
              <Input
                id="marketing-end"
                type="date"
                className="mt-1"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="marketing-budget">Budget (FCFA)</Label>
              <Input
                id="marketing-budget"
                className="mt-1"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(v as MarketingCampaignStatusDto)
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
              <Label htmlFor="marketing-desc">Description</Label>
              <textarea
                id="marketing-desc"
                className="mt-1 w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                disabled={
                  !title.trim() ||
                  !channel.trim() ||
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
            Campagnes ({campaigns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune campagne.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Titre</th>
                    <th className="pb-2 pr-4">Organisation</th>
                    <th className="pb-2 pr-4">Canal</th>
                    <th className="pb-2 pr-4">Période</th>
                    <th className="pb-2 pr-4">Budget</th>
                    <th className="pb-2 pr-4">Statut</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 font-medium">{row.title}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {orgName(row.organizationId)}
                      </td>
                      <td className="py-2 pr-4">{row.channel}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {formatDate(row.startDate)} → {formatDate(row.endDate)}
                      </td>
                      <td className="py-2 pr-4">
                        {row.budget ? formatFcfa(Number(row.budget)) : "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary">
                          {MARKETING_STATUS_LABEL[row.status]}
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
