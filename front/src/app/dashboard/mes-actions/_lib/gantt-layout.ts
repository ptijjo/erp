import type {
  ActionItemDto,
  TaskStatusDto,
  TaskSubtaskDto,
} from "~/lib/api-types";

export type GanttRowKind = "parent" | "subtask";

export type GanttItem = {
  id: string;
  kind: GanttRowKind;
  depth: number;
  title: string;
  status: TaskStatusDto;
  startDate: string | null;
  dueDate: string | null;
  start: Date;
  end: Date;
  hasDueDate: boolean;
  /** Action parent (pour href / chips). */
  action: ActionItemDto;
  subtask?: TaskSubtaskDto;
};

export type GanttTimeline = {
  rangeStart: Date;
  rangeEnd: Date;
  totalMs: number;
  weekMarkers: { date: Date; label: string; offsetPct: number }[];
  todayOffsetPct: number | null;
};

const MS_DAY = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function startOfWeekMonday(d: Date): Date {
  const day = startOfDay(d);
  const dow = day.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(day, diff);
}

function resolveStart(
  plannedStart: string | null | undefined,
  fallbackIso: string,
): Date {
  if (plannedStart) {
    const d = startOfDay(new Date(plannedStart));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return startOfDay(new Date(fallbackIso));
}

function parentBar(action: ActionItemDto): {
  start: Date;
  end: Date;
  hasDueDate: boolean;
} {
  const start = resolveStart(action.startDate, action.createdAt);
  let end: Date;
  let hasDueDate = false;

  if (action.dueDate) {
    end = startOfDay(new Date(action.dueDate));
    hasDueDate = true;
  } else {
    end = addDays(start, 1);
  }

  if (end.getTime() < start.getTime()) {
    end = addDays(start, 1);
  }

  return { start, end, hasDueDate };
}

function subtaskBar(
  parent: ActionItemDto,
  sub: TaskSubtaskDto,
): { start: Date; end: Date; hasDueDate: boolean } {
  const start = resolveStart(sub.startDate, sub.createdAt);
  let end: Date;
  let hasDueDate = false;

  if (sub.dueDate) {
    end = startOfDay(new Date(sub.dueDate));
    hasDueDate = true;
  } else if (parent.dueDate) {
    end = startOfDay(new Date(parent.dueDate));
    hasDueDate = true;
  } else {
    end = addDays(start, 1);
  }

  if (end.getTime() < start.getTime()) {
    end = addDays(start, 1);
  }

  return { start, end, hasDueDate };
}

/** Lignes Gantt hiérarchiques : parent puis sous-tâches indentées. */
export function buildGanttItems(actions: ActionItemDto[]): GanttItem[] {
  const sortedParents = [...actions].sort((a, b) => {
    const aStart = resolveStart(a.startDate, a.createdAt).getTime();
    const bStart = resolveStart(b.startDate, b.createdAt).getTime();
    if (aStart !== bStart) return aStart - bStart;
    return a.title.localeCompare(b.title, "fr");
  });

  const rows: GanttItem[] = [];

  for (const action of sortedParents) {
    const bar = parentBar(action);
    rows.push({
      id: action.id,
      kind: "parent",
      depth: 0,
      title: action.title,
      status: action.status,
      startDate: action.startDate ?? null,
      dueDate: action.dueDate,
      start: bar.start,
      end: bar.end,
      hasDueDate: bar.hasDueDate,
      action,
    });

    const subtasks = action.subtasks ?? [];
    for (const sub of subtasks) {
      const subBar = subtaskBar(action, sub);
      rows.push({
        id: `${action.id}:${sub.id}`,
        kind: "subtask",
        depth: 1,
        title: sub.title,
        status: sub.status,
        startDate: sub.startDate,
        dueDate: sub.dueDate,
        start: subBar.start,
        end: subBar.end,
        hasDueDate: subBar.hasDueDate,
        action,
        subtask: sub,
      });
    }
  }

  return rows;
}

export function computeGanttTimeline(items: GanttItem[]): GanttTimeline {
  const now = startOfDay(new Date());
  const paddingDays = 7;

  let rangeStart = addDays(now, -paddingDays);
  let rangeEnd = addDays(now, paddingDays * 4);

  for (const item of items) {
    if (item.start.getTime() < rangeStart.getTime()) {
      rangeStart = addDays(item.start, -3);
    }
    if (item.end.getTime() > rangeEnd.getTime()) {
      rangeEnd = addDays(item.end, 7);
    }
  }

  const totalMs = Math.max(rangeEnd.getTime() - rangeStart.getTime(), MS_DAY);

  const weekMarkers: GanttTimeline["weekMarkers"] = [];
  let cursor = startOfWeekMonday(rangeStart);
  while (cursor.getTime() <= rangeEnd.getTime()) {
    const offsetPct =
      ((cursor.getTime() - rangeStart.getTime()) / totalMs) * 100;
    weekMarkers.push({
      date: cursor,
      label: cursor.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      }),
      offsetPct: Math.min(100, Math.max(0, offsetPct)),
    });
    cursor = addDays(cursor, 7);
  }

  const todayMs = now.getTime();
  const todayOffsetPct =
    todayMs >= rangeStart.getTime() && todayMs <= rangeEnd.getTime()
      ? ((todayMs - rangeStart.getTime()) / totalMs) * 100
      : null;

  return { rangeStart, rangeEnd, totalMs, weekMarkers, todayOffsetPct };
}

export function ganttBarMetrics(
  item: GanttItem,
  timeline: GanttTimeline,
): { leftPct: number; widthPct: number } {
  const barEnd = addDays(item.end, 1);
  const startMs = Math.max(item.start.getTime(), timeline.rangeStart.getTime());
  const endMs = Math.min(barEnd.getTime(), timeline.rangeEnd.getTime());
  const leftPct =
    ((startMs - timeline.rangeStart.getTime()) / timeline.totalMs) * 100;
  const widthPct = Math.max(
    ((endMs - startMs) / timeline.totalMs) * 100,
    item.hasDueDate ? 1.5 : 0.8,
  );

  return {
    leftPct: Math.min(100, Math.max(0, leftPct)),
    widthPct: Math.min(100 - leftPct, widthPct),
  };
}

export const GANTT_STATUS_BAR_CLASS: Record<TaskStatusDto, string> = {
  TODO: "bg-orange-400/90",
  IN_PROGRESS: "bg-amber-400/90",
  DONE: "bg-emerald-500/90",
};

/** @deprecated Prefer buildGanttItems (already sorted). */
export function sortGanttItems(items: GanttItem[]): GanttItem[] {
  return items;
}
