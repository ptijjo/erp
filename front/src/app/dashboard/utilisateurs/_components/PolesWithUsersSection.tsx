"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Factory,
  Landmark,
  Layers,
  Lock,
  Megaphone,
  Pencil,
  Plus,
  Scale,
  Trash2,
  Target,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import type { PoleDto, UserListItemDto } from "~/lib/api-types";
import { api } from "~/lib/api";
import { apiErrorMessage } from "~/lib/api-error-message";
import { isSystemPoleCode } from "~/lib/system-poles";
import { cn } from "~/lib/utils";

import { rolePoleLabel } from "../_lib/pole-label";

export type PoleListFilter =
  | { kind: "all" }
  | { kind: "hors" }
  | { kind: "pole"; poleId: string };

type Props = {
  poles: PoleDto[];
  users: UserListItemDto[];
  polesLoading: boolean;
  polesError: boolean;
  canCreatePole: boolean;
  canUpdatePole: boolean;
  canDeletePole: boolean;
  filter: PoleListFilter;
  onFilterChange: (filter: PoleListFilter) => void;
};

const POLE_ICONS: Record<string, LucideIcon> = {
  Pole_OPERATIONS: Briefcase,
  Pole_STRATEGY_DEVELOPMENT: Target,
  Pole_FINANCE: Wallet,
  Pole_LEGAL: Scale,
  Pole_ARCHITECTURE_HERITAGE: Landmark,
  Pole_MARKETING_COMMUNICATION: Megaphone,
  Pole_PRODUCTION: Factory,
  Pole_HR: UserRound,
};

function poleIcon(code: string): LucideIcon {
  return POLE_ICONS[code] ?? Layers;
}

function shortPoleName(name: string): string {
  return name.replace(/^Pôle\s+/i, "");
}

function countForPole(users: UserListItemDto[], code: string): number {
  return users.filter(
    (user) =>
      user.organization.organizationType === "MAIN" &&
      user.role.pole?.code === code,
  ).length;
}

export function userMatchesPoleFilter(
  user: UserListItemDto,
  filter: PoleListFilter,
  poles: PoleDto[],
): boolean {
  switch (filter.kind) {
    case "all":
      return true;
    case "hors":
      return (
        user.organization.organizationType === "MAIN" && user.role.pole == null
      );
    case "pole": {
      const pole = poles.find((item) => item.id === filter.poleId);
      if (!pole) return false;
      return (
        user.organization.organizationType === "MAIN" &&
        user.role.pole?.code === pole.code
      );
    }
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

function FilterChip({
  active,
  label,
  count,
  icon: Icon,
  system,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  icon: LucideIcon;
  system?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={system ? `${label} · pôle système` : label}
      onClick={onClick}
      className={cn(
        "inline-flex max-w-56 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-white text-foreground hover:border-primary/40 hover:bg-primary/5",
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-xs tabular-nums",
          active ? "bg-white/20" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
      {system ? (
        <Lock className="size-3 shrink-0 opacity-70" aria-hidden />
      ) : null}
    </button>
  );
}

export function PolesWithUsersSection({
  poles,
  users,
  polesLoading,
  polesError,
  canCreatePole,
  canUpdatePole,
  canDeletePole,
  filter,
  onFilterChange,
}: Props) {
  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const horsCount = useMemo(
    () =>
      users.filter(
        (user) =>
          user.organization.organizationType === "MAIN" &&
          user.role.pole == null,
      ).length,
    [users],
  );

  const selectedPole =
    filter.kind === "pole"
      ? (poles.find((pole) => pole.id === filter.poleId) ?? null)
      : null;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/poles/${id}`);
    },
    onSuccess: async () => {
      setDeleteError(null);
      onFilterChange({ kind: "all" });
      await queryClient.invalidateQueries({ queryKey: ["poles"] });
    },
    onError: (err) => {
      setDeleteError(apiErrorMessage(err, "Impossible de supprimer le pôle"));
    },
  });

  function confirmDelete(pole: PoleDto) {
    const systemNote = isSystemPoleCode(pole.code)
      ? "\n\nAttention : pôle système VIFAA — le seeder pourra le recréer au prochain démarrage de l’API."
      : "";
    const ok = window.confirm(
      `Supprimer le pôle « ${pole.name} » (${pole.code}) ?\nLes rôles rattachés seront détachés (sans pôle).${systemNote}`,
    );
    if (!ok) return;
    deleteMutation.mutate(pole.id);
  }

  return (
    <section className="space-y-2">
      {polesLoading ? (
        <p className="text-sm text-muted-foreground">Chargement des pôles…</p>
      ) : polesError ? (
        <p className="text-sm text-destructive">
          Impossible de charger la liste des pôles.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            active={filter.kind === "all"}
            label="Tous"
            count={users.length}
            icon={Users}
            onClick={() => onFilterChange({ kind: "all" })}
          />
          {poles.map((pole) => (
            <FilterChip
              key={pole.id}
              active={filter.kind === "pole" && filter.poleId === pole.id}
              label={shortPoleName(pole.name)}
              count={countForPole(users, pole.code)}
              icon={poleIcon(pole.code)}
              system={isSystemPoleCode(pole.code)}
              onClick={() =>
                onFilterChange({ kind: "pole", poleId: pole.id })
              }
            />
          ))}
          <FilterChip
            active={filter.kind === "hors"}
            label={rolePoleLabel(null)}
            count={horsCount}
            icon={UserRound}
            onClick={() => onFilterChange({ kind: "hors" })}
          />
          <div className="ml-auto flex items-center gap-1">
            {selectedPole && canUpdatePole ? (
              <Link
                href={`/dashboard/hq/organisations/poles/${selectedPole.id}/edit`}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={`Modifier ${selectedPole.name}`}
                title="Modifier"
              >
                <Pencil className="size-4" />
              </Link>
            ) : null}
            {selectedPole && canDeletePole ? (
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                aria-label={`Supprimer ${selectedPole.name}`}
                title="Supprimer"
                disabled={deleteMutation.isPending}
                onClick={() => confirmDelete(selectedPole)}
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
            {canCreatePole ? (
              <Link
                href="/dashboard/hq/organisations/poles/add"
                className="inline-flex size-8 items-center justify-center rounded-md text-primary hover:bg-primary/10"
                aria-label="Nouveau pôle"
                title="Nouveau pôle"
              >
                <Plus className="size-4" />
              </Link>
            ) : null}
          </div>
        </div>
      )}
      {deleteError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {deleteError}
        </p>
      ) : null}
    </section>
  );
}
