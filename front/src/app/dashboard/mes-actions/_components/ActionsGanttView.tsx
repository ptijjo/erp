"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";

import {
  ActionStatusPill,
  ActionPriorityPill,
} from "~/app/dashboard/mes-actions/_components/ActionBoardCells";
import { TASK_STATUS_LABEL } from "~/app/dashboard/mes-actions/_lib/action-labels";
import {
  GANTT_STATUS_BAR_CLASS,
  buildGanttItems,
  computeGanttTimeline,
  ganttBarMetrics,
} from "~/app/dashboard/mes-actions/_lib/gantt-layout";
import { formatShortDueDate } from "~/app/dashboard/mes-actions/_lib/action-board";
import type { ActionItemDto, TaskStatusDto } from "~/lib/api-types";
import { cn } from "~/lib/utils";

const STATUS_OPTIONS = Object.entries(TASK_STATUS_LABEL) as [
  TaskStatusDto,
  string,
][];

type ActionsGanttViewProps = {
  actions: ActionItemDto[];
  onOpenTask?: (action: ActionItemDto) => void;
};

const ROW_HEIGHT = 44;
const LABEL_WIDTH = 260;

export function ActionsGanttView({
  actions,
  onOpenTask,
}: ActionsGanttViewProps) {
  const ganttItems = useMemo(() => buildGanttItems(actions), [actions]);
  const timeline = useMemo(
    () => computeGanttTimeline(ganttItems),
    [ganttItems],
  );

  const rangeLabel = `${timeline.rangeStart.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })} — ${timeline.rangeEnd.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  if (ganttItems.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucune action à afficher sur le planning.
      </p>
    );
  }

  const parentChips = ganttItems.filter((i) => i.kind === "parent");

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2.5">
        <div>
          <h3 className="text-sm font-semibold">Planning Gantt</h3>
          <p className="text-muted-foreground text-xs">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {STATUS_OPTIONS.map(([status, label]) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "size-2.5 rounded-sm",
                  GANTT_STATUS_BAR_CLASS[status],
                )}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          className="relative min-w-[720px]"
          style={{ minHeight: ganttItems.length * ROW_HEIGHT + 48 }}
        >
          <div className="sticky top-0 z-20 flex border-b bg-background">
            <div
              className="shrink-0 border-r"
              style={{ width: LABEL_WIDTH }}
            />
            <div className="relative h-10 flex-1">
              {timeline.weekMarkers.map((marker) => (
                <div
                  key={marker.date.toISOString()}
                  className="absolute top-0 flex h-full flex-col justify-end pb-1"
                  style={{ left: `${marker.offsetPct}%` }}
                >
                  <span className="text-muted-foreground -translate-x-1/2 text-[10px] font-medium whitespace-nowrap">
                    {marker.label}
                  </span>
                  <div className="bg-border absolute bottom-0 left-0 h-full w-px -translate-x-1/2" />
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex">
            <div className="shrink-0" style={{ width: LABEL_WIDTH }} />
            <div className="relative flex-1">
              {timeline.todayOffsetPct != null && (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-red-500/70"
                  style={{ left: `${timeline.todayOffsetPct}%` }}
                  aria-hidden
                />
              )}

              {ganttItems.map((item, index) => {
                const { leftPct, widthPct } = ganttBarMetrics(item, timeline);
                const endLabel = formatShortDueDate(item.dueDate);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "relative border-b border-border/50",
                      index % 2 === 0 ? "bg-background" : "bg-muted/10",
                    )}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {timeline.weekMarkers.map((marker) => (
                      <div
                        key={`${item.id}-${marker.date.toISOString()}`}
                        className="bg-border/40 absolute top-0 bottom-0 w-px"
                        style={{ left: `${marker.offsetPct}%` }}
                      />
                    ))}

                    <div
                      className="absolute top-1/2 flex h-7 -translate-y-1/2 items-center"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        minWidth: item.hasDueDate ? 24 : 8,
                      }}
                      title={`${item.title} — ${TASK_STATUS_LABEL[item.status]} — fin ${endLabel}`}
                    >
                      <div
                        className={cn(
                          "flex h-full w-full items-center overflow-hidden rounded-md px-2 shadow-sm",
                          GANTT_STATUS_BAR_CLASS[item.status],
                          item.kind === "subtask" && "h-5 opacity-90",
                          item.action.kind === "SYSTEM" &&
                            item.kind === "parent" &&
                            "ring-1 ring-violet-300 ring-inset",
                        )}
                      >
                        <span className="truncate text-[10px] font-medium text-white drop-shadow-sm">
                          {item.kind === "subtask"
                            ? `${item.title} · ${endLabel}`
                            : item.title}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="pointer-events-none absolute top-10 left-0 z-10"
            style={{ width: LABEL_WIDTH }}
          >
            {ganttItems.map((item, index) => (
              <div
                key={`label-${item.id}`}
                className={cn(
                  "pointer-events-auto flex items-center gap-2 border-r border-b border-border/50 px-3",
                  index % 2 === 0 ? "bg-background" : "bg-muted/10",
                )}
                style={{
                  height: ROW_HEIGHT,
                  paddingLeft: 12 + item.depth * 16,
                }}
              >
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className={cn(
                      "block w-full truncate text-left text-sm font-medium hover:underline",
                      item.kind === "subtask" && "text-sm font-normal",
                      item.action.kind === "MANUAL" &&
                        item.kind === "parent" &&
                        onOpenTask &&
                        "cursor-pointer",
                    )}
                    disabled={
                      !(
                        item.action.kind === "MANUAL" &&
                        item.kind === "parent" &&
                        onOpenTask
                      )
                    }
                    onClick={() => {
                      if (item.kind === "parent" && onOpenTask) {
                        onOpenTask(item.action);
                      }
                    }}
                  >
                    {item.kind === "subtask" ? `↳ ${item.title}` : item.title}
                  </button>
                  <p className="text-muted-foreground truncate text-[10px]">
                    {TASK_STATUS_LABEL[item.status]}
                    {" · "}
                    {formatShortDueDate(item.startDate)}
                    {" → "}
                    {formatShortDueDate(item.dueDate)}
                    {!item.hasDueDate && " · sans échéance"}
                  </p>
                </div>
                {item.kind === "parent" && item.action.href ? (
                  <Link
                    href={item.action.href}
                    className="text-muted-foreground hover:text-primary shrink-0"
                    aria-label="Ouvrir"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t bg-muted/10 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {parentChips.slice(0, 8).map((item) => (
            <div
              key={`chip-${item.id}`}
              className="inline-flex items-center gap-2 rounded-md border bg-background px-2 py-1"
            >
              <ActionStatusPill
                status={item.status}
                className="min-w-0 px-2 py-0.5 text-[10px]"
              />
              <ActionPriorityPill priority={item.action.priority} />
              <span className="max-w-[140px] truncate text-xs">
                {item.title}
              </span>
            </div>
          ))}
          {parentChips.length > 8 && (
            <span className="text-muted-foreground self-center text-xs">
              +{parentChips.length - 8} autres
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
