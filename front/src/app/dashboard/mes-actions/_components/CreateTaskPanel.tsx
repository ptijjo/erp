"use client";

import type { ActionGroupId } from "~/app/dashboard/mes-actions/_lib/action-board";
import { OrganizationSelectField } from "~/app/dashboard/_components/OrganizationSelectField";
import {
  TASK_PRIORITY_LABEL,
  TASK_SCOPE_LABEL,
} from "~/app/dashboard/mes-actions/_lib/action-labels";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { OrganizationDto } from "~/lib/api-types";
import type { TaskPriorityDto, TaskScopeDto } from "~/lib/api-types";
import { cn } from "~/lib/utils";

const PRIORITY_OPTIONS = Object.entries(TASK_PRIORITY_LABEL) as [
  TaskPriorityDto,
  string,
][];

type CreateTaskPanelProps = {
  open: boolean;
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriorityDto;
  scope: TaskScopeDto;
  poleCode: string;
  organizationId: string;
  defaultOrganizationId: string;
  main: boolean;
  selectableOrgs: OrganizationDto[];
  scopeOptions: [TaskScopeDto, string][];
  poles: { id: string; code: string; name: string }[];
  pending: boolean;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onDueDateChange: (v: string) => void;
  onPriorityChange: (v: TaskPriorityDto) => void;
  onScopeChange: (v: TaskScopeDto) => void;
  onPoleCodeChange: (v: string) => void;
  onOrganizationChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  presetGroup?: ActionGroupId | null;
};

const GROUP_HINT: Partial<Record<ActionGroupId, string>> = {
  this_month: "Échéance suggérée : fin du mois en cours",
  next_month: "Échéance suggérée : mois prochain",
  overdue: "Pensez à une échéance proche",
};

export function CreateTaskPanel({
  open,
  title,
  description,
  dueDate,
  priority,
  scope,
  poleCode,
  organizationId,
  defaultOrganizationId,
  main,
  selectableOrgs,
  scopeOptions,
  poles,
  pending,
  onTitleChange,
  onDescriptionChange,
  onDueDateChange,
  onPriorityChange,
  onScopeChange,
  onPoleCodeChange,
  onOrganizationChange,
  onSubmit,
  onCancel,
  presetGroup,
}: CreateTaskPanelProps) {
  if (!open) return null;

  const formOrganizationId = organizationId || defaultOrganizationId;

  return (
    <div className="mb-4 rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Nouvelle tâche</h2>
          {presetGroup && GROUP_HINT[presetGroup] && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              {GROUP_HINT[presetGroup]}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="submit"
            form="create-task-form"
            disabled={!title.trim() || pending}
          >
            {pending ? "Création…" : "Créer la tâche"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </div>
      <form
        id="create-task-form"
        className="space-y-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || pending) return;
          onSubmit();
        }}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="task-title">Titre</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Ex. Optimiser les stratégies de…"
              maxLength={200}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due">Échéance</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-desc">Description</Label>
          <textarea
            id="task-desc"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Détails optionnels…"
            className={cn(
              "min-h-[56px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30",
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Priorité</Label>
            <Select
              value={priority}
              onValueChange={(v) => onPriorityChange(v as TaskPriorityDto)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Périmètre</Label>
            <Select
              value={scope}
              onValueChange={(v) => onScopeChange(v as TaskScopeDto)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scopeOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {main && scope === "POLE" && (
            <div className="space-y-2">
              <Label>Pôle</Label>
              <Select value={poleCode} onValueChange={onPoleCodeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un pôle" />
                </SelectTrigger>
                <SelectContent>
                  {poles.map((p) => (
                    <SelectItem key={p.id} value={p.code}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {main && (
          <OrganizationSelectField
            id="task-org"
            organizations={selectableOrgs}
            value={formOrganizationId}
            onChange={onOrganizationChange}
            label="Organisation"
          />
        )}
      </form>
    </div>
  );
}

function defaultDueForGroup(groupId: ActionGroupId | null): string {
  if (!groupId) return "";
  const now = new Date();
  if (groupId === "this_month") {
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return end.toISOString().slice(0, 10);
  }
  if (groupId === "next_month") {
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return end.toISOString().slice(0, 10);
  }
  if (groupId === "overdue") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }
  return "";
}

export { defaultDueForGroup };
