import type {
  ActionItemKindDto,
  TaskPriorityDto,
  TaskScopeDto,
  TaskStatusDto,
} from "~/lib/api-types";

export const TASK_STATUS_LABEL: Record<TaskStatusDto, string> = {
  TODO: "En attente",
  IN_PROGRESS: "En cours",
  DONE: "Fait",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriorityDto, string> = {
  LOW: "Faible",
  NORMAL: "Moyenne",
  HIGH: "Élevée",
};

export const TASK_SCOPE_LABEL: Record<TaskScopeDto, string> = {
  USER: "Personnelle",
  ORGANIZATION: "Organisation",
  POLE: "Pôle",
};

export const ACTION_KIND_LABEL: Record<ActionItemKindDto, string> = {
  MANUAL: "Manuelle",
  SYSTEM: "Système",
};

export function formatActionDueDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function isOverdue(iso: string | null, status: TaskStatusDto): boolean {
  if (!iso || status === "DONE") return false;
  const due = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}
