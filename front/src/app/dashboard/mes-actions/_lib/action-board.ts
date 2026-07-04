import type { ActionItemDto, TaskStatusDto } from "~/lib/api-types";

import { isOverdue } from "./action-labels";

export type BoardView = "table" | "kanban" | "gantt";

export type ActionGroupId =
  | "overdue"
  | "this_month"
  | "next_month"
  | "later"
  | "no_due";

export type ActionGroup = {
  id: ActionGroupId;
  label: string;
  accentClass: string;
  items: ActionItemDto[];
};

const GROUP_META: Record<
  ActionGroupId,
  { label: string; accentClass: string }
> = {
  overdue: {
    label: "En retard",
    accentClass: "bg-red-500",
  },
  this_month: {
    label: "Ce mois-ci",
    accentClass: "bg-pink-400",
  },
  next_month: {
    label: "Mois prochain",
    accentClass: "bg-violet-500",
  },
  later: {
    label: "Plus tard",
    accentClass: "bg-sky-500",
  },
  no_due: {
    label: "Sans échéance",
    accentClass: "bg-slate-400",
  },
};

const GROUP_ORDER: ActionGroupId[] = [
  "overdue",
  "this_month",
  "next_month",
  "later",
  "no_due",
];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function resolveGroupId(action: ActionItemDto, now: Date): ActionGroupId {
  if (!action.dueDate) return "no_due";
  const due = new Date(action.dueDate);
  if (Number.isNaN(due.getTime())) return "no_due";

  if (isOverdue(action.dueDate, action.status)) return "overdue";

  const thisMonth = startOfMonth(now).getTime();
  const nextMonthStart = addMonths(now, 1).getTime();
  const monthAfterStart = addMonths(now, 2).getTime();
  const dueMonth = startOfMonth(due).getTime();

  if (dueMonth === thisMonth) return "this_month";
  if (dueMonth === nextMonthStart) return "next_month";
  if (dueMonth >= monthAfterStart) return "later";
  if (dueMonth < thisMonth) return "overdue";
  return "this_month";
}

export function groupActions(actions: ActionItemDto[]): ActionGroup[] {
  const now = new Date();
  const buckets = new Map<ActionGroupId, ActionItemDto[]>();

  for (const id of GROUP_ORDER) {
    buckets.set(id, []);
  }

  for (const action of actions) {
    const groupId = resolveGroupId(action, now);
    buckets.get(groupId)!.push(action);
  }

  return GROUP_ORDER.map((id) => ({
    id,
    ...GROUP_META[id],
    items: buckets.get(id) ?? [],
  })).filter((g) => g.items.length > 0);
}

export function progressForStatus(status: TaskStatusDto): number {
  switch (status) {
    case "DONE":
      return 100;
    case "IN_PROGRESS":
      return 60;
    case "TODO":
      return 0;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function formatShortDueDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export const STATUS_PILL_CLASS: Record<TaskStatusDto, string> = {
  DONE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  IN_PROGRESS: "bg-amber-100 text-amber-900 border-amber-200",
  TODO: "bg-orange-50 text-orange-800 border-orange-200",
};

export const PRIORITY_PILL_CLASS: Record<
  ActionItemDto["priority"],
  string
> = {
  HIGH: "bg-sky-100 text-sky-900 border-sky-200",
  NORMAL: "bg-blue-50 text-blue-800 border-blue-100",
  LOW: "bg-emerald-50 text-emerald-800 border-emerald-100",
};

export const KANBAN_COLUMNS: {
  status: TaskStatusDto;
  label: string;
  headerClass: string;
}[] = [
  {
    status: "TODO",
    label: "En attente",
    headerClass: "border-orange-200 bg-orange-50/80",
  },
  {
    status: "IN_PROGRESS",
    label: "En cours",
    headerClass: "border-amber-200 bg-amber-50/80",
  },
  {
    status: "DONE",
    label: "Fait",
    headerClass: "border-emerald-200 bg-emerald-50/80",
  },
];
