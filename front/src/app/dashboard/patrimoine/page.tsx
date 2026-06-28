"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Pencil, Trash2 } from "lucide-react";

import { OrganizationSelectField } from "~/app/dashboard/_components/OrganizationSelectField";
import { HERITAGE_STATUS_LABEL } from "~/app/dashboard/_lib/pole-status-labels";
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
  HeritageAssetDto,
  HeritageAssetStatusDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";
import { useScopedOrganizations } from "~/lib/use-scoped-organizations";

const STATUS_OPTIONS = Object.entries(HERITAGE_STATUS_LABEL) as [
  HeritageAssetStatusDto,
  string,
][];

export default function PatrimoinePage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { main, selectableOrgs, defaultOrganizationId } =
    useScopedOrganizations();

  const canRead =
    me != null && hasMePermission(me, "read", "HeritageAsset");
  const canCreate =
    me != null && hasMePermission(me, "create", "HeritageAsset");
  const canUpdate =
    me != null && hasMePermission(me, "update", "HeritageAsset");
  const canDelete =
    me != null && hasMePermission(me, "delete", "HeritageAsset");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const formOrganizationId = organizationId || defaultOrganizationId;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<HeritageAssetStatusDto>("ACTIVE");

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["heritage", "assets"] as const,
    queryFn: async () => {
      const { data } = await api.get<HeritageAssetDto[]>("/heritage/assets");
      return data;
    },
    enabled: canRead,
  });

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setLocation("");
    setValue("");
    setStatus("ACTIVE");
    setOrganizationId("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const orgId = main ? formOrganizationId : me!.organisationId;
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        value: value.trim() ? parseDecimal(value) : undefined,
        status,
      };
      if (editingId) {
        await api.patch(`/heritage/assets/${editingId}`, body);
      } else {
        await api.post("/heritage/assets", {
          organizationId: orgId,
          ...body,
        });
      }
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["heritage"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Enregistrement impossible"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/heritage/assets/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["heritage"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Suppression impossible"));
    },
  });

  function startEdit(row: HeritageAssetDto) {
    setEditingId(row.id);
    setOrganizationId(row.organizationId);
    setName(row.name);
    setDescription(row.description ?? "");
    setLocation(row.location ?? "");
    setValue(row.value ?? "");
    setStatus(row.status);
  }

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Patrimoine"
          description="Vous n'avez pas accès au registre patrimonial."
        />
      </PageShell>
    );
  }

  const orgName = (id: string) =>
    selectableOrgs.find((o) => o.id === id)?.name ?? id.slice(0, 8);

  return (
    <PageShell>
      <PageHeader
        title="Patrimoine"
        description="Actifs et biens du pôle architecture et patrimoine."
      />

      {(canCreate || canUpdate) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="size-4" />
              {editingId ? "Modifier l'actif" : "Nouvel actif patrimonial"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {main && !editingId ? (
              <OrganizationSelectField
                id="heritage-org"
                label="Organisation"
                organizations={selectableOrgs}
                value={formOrganizationId}
                onChange={setOrganizationId}
              />
            ) : null}
            <div>
              <Label htmlFor="heritage-name">Nom</Label>
              <Input
                id="heritage-name"
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="heritage-location">Localisation</Label>
              <Input
                id="heritage-location"
                className="mt-1"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="heritage-value">Valeur (FCFA)</Label>
              <Input
                id="heritage-value"
                className="mt-1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as HeritageAssetStatusDto)}
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
              <Label htmlFor="heritage-desc">Description</Label>
              <textarea
                id="heritage-desc"
                className="mt-1 w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                disabled={
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
          <CardTitle className="text-base">Registre ({assets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun actif enregistré.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 pr-4">Nom</th>
                    <th className="pb-2 pr-4">Organisation</th>
                    <th className="pb-2 pr-4">Localisation</th>
                    <th className="pb-2 pr-4">Valeur</th>
                    <th className="pb-2 pr-4">Statut</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assets.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 font-medium">{row.name}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {orgName(row.organizationId)}
                      </td>
                      <td className="py-2 pr-4">{row.location ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {row.value ? formatFcfa(Number(row.value)) : "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="secondary">
                          {HERITAGE_STATUS_LABEL[row.status]}
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
                                    `Supprimer « ${row.name} » ?`,
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
