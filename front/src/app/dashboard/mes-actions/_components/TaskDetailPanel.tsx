"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";

import {
  ActionStatusPill,
  ActionPriorityPill,
} from "~/app/dashboard/mes-actions/_components/ActionBoardCells";
import {
  formatShortDueDate,
  formatSubtaskProgress,
  progressForAction,
} from "~/app/dashboard/mes-actions/_lib/action-board";
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
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
import { api } from "~/lib/api";
import { apiErrorMessage } from "~/lib/api-error-message";
import type {
  ActionItemDto,
  TaskPriorityDto,
  TaskStatusDto,
  TaskSubtaskDto,
} from "~/lib/api-types";
import { cn } from "~/lib/utils";

const STATUS_OPTIONS = Object.entries(TASK_STATUS_LABEL) as [
  TaskStatusDto,
  string,
][];
const PRIORITY_OPTIONS = Object.entries(TASK_PRIORITY_LABEL) as [
  TaskPriorityDto,
  string,
][];

function toDateInputValue(iso: string | null | undefined): string {
  return iso?.slice(0, 10) ?? "";
}

type TaskDetailPanelProps = {
  action: ActionItemDto | null;
  canUpdate: boolean;
  canCreateSubtask: boolean;
  canDeleteSubtask: boolean;
  onClose: () => void;
  onActionUpdated: (action: ActionItemDto) => void;
};

export function TaskDetailPanel({
  action,
  canUpdate,
  canCreateSubtask,
  canDeleteSubtask,
  onClose,
  onActionUpdated,
}: TaskDetailPanelProps) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newStatus, setNewStatus] = useState<TaskStatusDto>("TODO");
  const [newPriority, setNewPriority] = useState<TaskPriorityDto>("NORMAL");
  const [taskStartDate, setTaskStartDate] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  useEffect(() => {
    if (!action || action.kind !== "MANUAL") return;
    setTaskStartDate(toDateInputValue(action.startDate));
    setTaskDueDate(toDateInputValue(action.dueDate));
  }, [action?.id, action?.startDate, action?.dueDate, action?.kind]);

  const invalidate = async (updated?: ActionItemDto) => {
    if (updated) onActionUpdated(updated);
    await queryClient.invalidateQueries({ queryKey: ["actions"] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!action) throw new Error("Aucune tâche");
      const { data } = await api.post<ActionItemDto>(
        `/actions/${action.id}/subtasks`,
        {
          title: newTitle.trim(),
          startDate: newStartDate || undefined,
          dueDate: newDueDate || undefined,
          status: newStatus,
          priority: newPriority,
        },
      );
      return data;
    },
    onSuccess: async (data) => {
      setNewTitle("");
      setNewStartDate("");
      setNewDueDate("");
      setNewStatus("TODO");
      setNewPriority("NORMAL");
      await invalidate(data);
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible d’ajouter la sous-tâche"));
    },
  });

  const updateTaskDatesMutation = useMutation({
    mutationFn: async (payload: {
      startDate?: string | null;
      dueDate?: string | null;
    }) => {
      if (!action) throw new Error("Aucune tâche");
      const { data } = await api.patch<ActionItemDto>(
        `/actions/${action.id}`,
        payload,
      );
      return data;
    },
    onSuccess: async (data) => {
      await invalidate(data);
    },
    onError: (e) => {
      if (action) {
        setTaskStartDate(toDateInputValue(action.startDate));
        setTaskDueDate(toDateInputValue(action.dueDate));
      }
      alert(apiErrorMessage(e, "Mise à jour des dates impossible"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      subtaskId,
      status,
      priority,
      startDate,
      dueDate,
    }: {
      subtaskId: string;
      status?: TaskStatusDto;
      priority?: TaskPriorityDto;
      startDate?: string | null;
      dueDate?: string | null;
    }) => {
      if (!action) throw new Error("Aucune tâche");
      const { data } = await api.patch<ActionItemDto>(
        `/actions/${action.id}/subtasks/${subtaskId}`,
        {
          ...(status != null ? { status } : {}),
          ...(priority != null ? { priority } : {}),
          ...(startDate !== undefined ? { startDate } : {}),
          ...(dueDate !== undefined ? { dueDate } : {}),
        },
      );
      return data;
    },
    onSuccess: async (data) => {
      await invalidate(data);
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Mise à jour impossible"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (subtaskId: string) => {
      if (!action) throw new Error("Aucune tâche");
      const { data } = await api.delete<ActionItemDto>(
        `/actions/${action.id}/subtasks/${subtaskId}`,
      );
      return data;
    },
    onSuccess: async (data) => {
      await invalidate(data);
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Suppression impossible"));
    },
  });

  if (!action || action.kind !== "MANUAL") return null;

  const subtasks = action.subtasks ?? [];
  const ratio = formatSubtaskProgress(action);
  const percent = progressForAction(action);

  return (
    <div className="mb-4 rounded-xl border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            Détail & sous-tâches
          </p>
          <h2 className="truncate text-sm font-semibold">{action.title}</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {formatShortDueDate(action.startDate)}
            {" → "}
            {formatShortDueDate(action.dueDate)}
            {ratio ? ` · Sous-tâches ${ratio}` : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ActionPriorityPill priority={action.priority} />
          <ActionStatusPill status={action.status} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {action.description ? (
          <p className="text-muted-foreground text-sm">{action.description}</p>
        ) : null}

        {canUpdate ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="task-detail-start">Date de début</Label>
              <Input
                id="task-detail-start"
                type="date"
                value={taskStartDate}
                disabled={updateTaskDatesMutation.isPending}
                onChange={(e) => setTaskStartDate(e.target.value)}
                onBlur={() => {
                  const current = toDateInputValue(action.startDate);
                  if (taskStartDate === current) return;
                  updateTaskDatesMutation.mutate({
                    startDate: taskStartDate || null,
                  });
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="task-detail-due">Date butoir</Label>
              <Input
                id="task-detail-due"
                type="date"
                value={taskDueDate}
                disabled={updateTaskDatesMutation.isPending}
                onChange={(e) => setTaskDueDate(e.target.value)}
                onBlur={() => {
                  const current = toDateInputValue(action.dueDate);
                  if (taskDueDate === current) return;
                  updateTaskDatesMutation.mutate({
                    dueDate: taskDueDate || null,
                  });
                }}
              />
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium">Avancement</span>
            <span className="text-muted-foreground tabular-nums">
              {ratio ? `${ratio} · ` : null}
              {percent}%
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Sous-tâches</h3>
          {subtasks.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Aucune sous-tâche. Ajoutez-en pour suivre l’avancement.
            </p>
          ) : (
            <ul className="space-y-2">
              {subtasks.map((sub) => (
                <SubtaskRow
                  key={sub.id}
                  subtask={sub}
                  canUpdate={canUpdate}
                  canDelete={canDeleteSubtask}
                  pending={
                    updateMutation.isPending || deleteMutation.isPending
                  }
                  onStatusChange={(status) =>
                    updateMutation.mutate({ subtaskId: sub.id, status })
                  }
                  onPriorityChange={(priority) =>
                    updateMutation.mutate({ subtaskId: sub.id, priority })
                  }
                  onDatesChange={(dates) =>
                    updateMutation.mutate({
                      subtaskId: sub.id,
                      ...dates,
                    })
                  }
                  onDelete={() => {
                    if (
                      window.confirm(
                        `Supprimer la sous-tâche « ${sub.title} » ?`,
                      )
                    ) {
                      deleteMutation.mutate(sub.id);
                    }
                  }}
                />
              ))}
            </ul>
          )}
        </div>

        {canCreateSubtask ? (
          <form
            className="grid gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-2 lg:grid-cols-7"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTitle.trim()) return;
              createMutation.mutate();
            }}
          >
            <div className="space-y-1 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="subtask-title">Nouvelle sous-tâche</Label>
              <Input
                id="subtask-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Titre"
                maxLength={200}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="subtask-start">Début</Label>
              <Input
                id="subtask-start"
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="subtask-due">Butoir</Label>
              <Input
                id="subtask-due"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Statut</Label>
              <Select
                value={newStatus}
                onValueChange={(v) => setNewStatus(v as TaskStatusDto)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Priorité</Label>
              <Select
                value={newPriority}
                onValueChange={(v) => setNewPriority(v as TaskPriorityDto)}
              >
                <SelectTrigger className="w-full">
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
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full"
                disabled={!newTitle.trim() || createMutation.isPending}
              >
                <Plus className="mr-1 size-4" />
                Ajouter
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
            Vous n’avez pas le droit d’ajouter des sous-tâches. Redémarrez
            l’API pour recharger les permissions, ou demandez à un admin.
          </p>
        )}
      </div>
    </div>
  );
}

function SubtaskRow({
  subtask,
  canUpdate,
  canDelete,
  pending,
  onStatusChange,
  onPriorityChange,
  onDatesChange,
  onDelete,
}: {
  subtask: TaskSubtaskDto;
  canUpdate: boolean;
  canDelete: boolean;
  pending: boolean;
  onStatusChange: (status: TaskStatusDto) => void;
  onPriorityChange: (priority: TaskPriorityDto) => void;
  onDatesChange: (dates: {
    startDate?: string | null;
    dueDate?: string | null;
  }) => void;
  onDelete: () => void;
}) {
  const [startDate, setStartDate] = useState(
    toDateInputValue(subtask.startDate),
  );
  const [dueDate, setDueDate] = useState(toDateInputValue(subtask.dueDate));

  useEffect(() => {
    setStartDate(toDateInputValue(subtask.startDate));
    setDueDate(toDateInputValue(subtask.dueDate));
  }, [subtask.id, subtask.startDate, subtask.dueDate]);

  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-lg border px-3 py-2",
        subtask.status === "DONE" && "bg-muted/40 opacity-80",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="checkbox"
          checked={subtask.status === "DONE"}
          disabled={!canUpdate || pending}
          onChange={() =>
            onStatusChange(subtask.status === "DONE" ? "TODO" : "DONE")
          }
          className="accent-primary size-4 shrink-0 self-start sm:self-center"
          aria-label={`Marquer ${subtask.title}`}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-medium",
              subtask.status === "DONE" &&
                "text-muted-foreground line-through",
            )}
          >
            {subtask.title}
          </p>
          {!canUpdate ? (
            <p className="text-muted-foreground text-[11px]">
              {formatShortDueDate(subtask.startDate)}
              {" → "}
              {formatShortDueDate(subtask.dueDate)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canUpdate ? (
            <>
              <Select
                value={subtask.status}
                disabled={pending}
                onValueChange={(v) => onStatusChange(v as TaskStatusDto)}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={subtask.priority}
                disabled={pending}
                onValueChange={(v) => onPriorityChange(v as TaskPriorityDto)}
              >
                <SelectTrigger className="h-8 w-[120px]">
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
            </>
          ) : (
            <>
              <ActionStatusPill
                status={subtask.status}
                className="min-w-0 px-2 py-0.5 text-[10px]"
              />
              <ActionPriorityPill priority={subtask.priority} />
            </>
          )}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive size-7 shrink-0"
              disabled={pending}
              onClick={onDelete}
              aria-label="Supprimer"
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
      {canUpdate ? (
        <div className="grid grid-cols-2 gap-2 pl-6 sm:max-w-sm">
          <Input
            type="date"
            aria-label={`Début ${subtask.title}`}
            className="h-8"
            value={startDate}
            disabled={pending}
            onChange={(e) => setStartDate(e.target.value)}
            onBlur={() => {
              const current = toDateInputValue(subtask.startDate);
              if (startDate === current) return;
              onDatesChange({ startDate: startDate || null });
            }}
          />
          <Input
            type="date"
            aria-label={`Butoir ${subtask.title}`}
            className="h-8"
            value={dueDate}
            disabled={pending}
            onChange={(e) => setDueDate(e.target.value)}
            onBlur={() => {
              const current = toDateInputValue(subtask.dueDate);
              if (dueDate === current) return;
              onDatesChange({ dueDate: dueDate || null });
            }}
          />
        </div>
      ) : null}
    </li>
  );
}
