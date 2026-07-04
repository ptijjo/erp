import type { ActionItemDto } from "~/lib/api-types";

export type GanttItem = {
  action: ActionItemDto;
  start: Date;
  end: Date;
  hasDueDate: boolean;
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

export function buildGanttItems(actions: ActionItemDto[]): GanttItem[] {
  return actions.map((action) => {
    const start = startOfDay(new Date(action.createdAt));
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

    return { action, start, end, hasDueDate };
  });
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

export const GANTT_STATUS_BAR_CLASS: Record<
  ActionItemDto["status"],
  string
> = {
  TODO: "bg-orange-400/90",
  IN_PROGRESS: "bg-amber-400/90",
  DONE: "bg-emerald-500/90",
};

export function sortGanttItems(items: GanttItem[]): GanttItem[] {
  return [...items].sort((a, b) => {
    const dueDiff = a.start.getTime() - b.start.getTime();
    if (dueDiff !== 0) return dueDiff;
    return a.action.title.localeCompare(b.action.title, "fr");
  });
}
