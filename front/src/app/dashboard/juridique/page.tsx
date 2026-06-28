"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Scale, Trash2 } from "lucide-react";

import { OrganizationSelectField } from "~/app/dashboard/_components/OrganizationSelectField";
import { LEGAL_STATUS_LABEL } from "~/app/dashboard/_lib/pole-status-labels";
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
  LegalContractDto,
  LegalContractStatusDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { useScopedOrganizations } from "~/lib/use-scoped-organizations";

const STATUS_OPTIONS = Object.entries(LEGAL_STATUS_LABEL) as [
  LegalContractStatusDto,
  string,
][];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default function JuridiquePage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { main, selectableOrgs, defaultOrganizationId } =
    useScopedOrganizations();

  const canRead =
    me != null && hasMePermission(me, "read", "LegalContract");
  const canCreate =
    me != null && hasMePermission(me, "create", "LegalContract");
  const canUpdate =
    me != null && hasMePermission(me, "update", "LegalContract");
  const canDelete =
    me != null && hasMePermission(me, "delete", "LegalContract");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const formOrganizationId = organizationId || defaultOrganizationId;
  const [title, setTitle] = useState("");
  const [partyName, setPartyName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<LegalContractStatusDto>("DRAFT");
  const [notes, setNotes] = useState("");

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["legal", "contracts"] as const,
    queryFn: async () => {
      const { data } = await api.get<LegalContractDto[]>("/legal/contracts");
      return data;
    },
    enabled: canRead,
  });

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setPartyName("");
    setStartDate("");
    setEndDate("");
    setStatus("DRAFT");
    setNotes("");
    setOrganizationId("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const orgId = main ? formOrganizationId : me!.organisationId;
      const body = {
        title: title.trim(),
        partyName: partyName.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status,
        notes: notes.trim() || undefined,
      };
      if (editingId) {
        await api.patch(`/legal/contracts/${editingId}`, body);
      } else {
        await api.post("/legal/contracts", {
          organizationId: orgId,
          ...body,
        });
      }
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["legal"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Enregistrement impossible"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/legal/contracts/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["legal"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Suppression impossible"));
    },
  });

  function startEdit(row: LegalContractDto) {
    setEditingId(row.id);
    setOrganizationId(row.organizationId);
    setTitle(row.title);
    setPartyName(row.partyName);
    setStartDate(row.startDate?.slice(0, 10) ?? "");
    setEndDate(row.endDate?.slice(0, 10) ?? "");
    setStatus(row.status);
    setNotes(row.notes ?? "");
  }

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Juridique"
          description="Vous n'avez pas accès aux contrats juridiques."
        />
      </PageShell>
    );
  }

  const orgName = (id: string) =>
    selectableOrgs.find((o) => o.id === id)?.name ?? id.slice(0, 8);

  return (
    <PageShell>
      <PageHeader
        title="Juridique"
        description="Contrats et engagements du pôle affaires juridiques."
      />

      {(canCreate || canUpdate) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="size-4" />
              {editingId ? "Modifier le contrat" : "Nouveau contrat"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {main && !editingId ? (
              <OrganizationSelectField
                id="legal-org"
                label="Organisation"
                organizations={selectableOrgs}
                value={formOrganizationId}
                onChange={setOrganizationId}
              />
            ) : null}
            <div>
              <Label htmlFor="legal-title">Intitulé</Label>
              <Input
                id="legal-title"
                className="mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="legal-party">Partie contractante</Label>
              <Input
                id="legal-party"
                className="mt-1"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="legal-start">Date de début</Label>
              <Input
                id="legal-start"
                type="date"
                className="mt-1"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="legal-end">Date de fin</Label>
              <Input
                id="legal-end"
                type="date"
                className="mt-1"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as LegalContractStatusDto)}
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
              <Label htmlFor="legal-notes">Notes</Label>
              <textarea
                id="legal-notes"
                className="mt-1 w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                disabled={
                  !title.trim() ||
                  !partyName.trim() ||
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
            Contrats ({contracts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun contrat enregistré.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Intitulé</th>
                    <th className="pb-2 pr-4">Partie</th>
                    <th className="pb-2 pr-4">Organisation</th>
                    <th className="pb-2 pr-4">Période</th>
                    <th className="pb-2 pr-4">Statut</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contracts.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 font-medium">{row.title}</td>
                      <td className="py-2 pr-4">{row.partyName}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {orgName(row.organizationId)}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {formatDate(row.startDate)} → {formatDate(row.endDate)}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary">
                          {LEGAL_STATUS_LABEL[row.status]}
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
