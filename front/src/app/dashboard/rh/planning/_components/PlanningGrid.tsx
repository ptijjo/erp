"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { employeeDisplayName } from "../../_lib/employee-display";
import { formatMinutesDuration, minutesToTime } from "../../_lib/date-input";
import { cn } from "~/lib/utils";
import type {
  EmployeeDto,
  WorkShiftDto,
  WorkShiftKindDto,
} from "~/lib/api-types";

/** Pas de saisie (minutes) : la souris se cale sur des quarts d’heure. */
const SNAP = 15;
const DAY_MIN = 24 * 60;
const MINUTE_MS = 60 * 1000;
const HANDLE_PX = 8;

export type PaintMode = WorkShiftKindDto | "ERASE";

type PaintDrag = {
  kind: "paint";
  employeeId: string;
  rect: DOMRect;
  startMin: number;
  currentMin: number;
};

type BlockEditDrag = {
  kind: "move" | "resize-start" | "resize-end";
  shiftId: string;
  rect: DOMRect;
  origStartMin: number;
  origEndMin: number;
  anchorMin: number;
};

type DragState = PaintDrag | BlockEditDrag;

export type PlanningSegmentInput = {
  employeeId: string;
  startAt: string;
  endAt: string;
  kind: WorkShiftKindDto;
};

export type PlanningSegmentUpdate = {
  startAt: string;
  endAt: string;
};

/** Modèle hebdomadaire affiché en surcouche (pointillés). */
export type RecurringPatternView = {
  id: string;
  employeeId: string;
  startMinute: number;
  endMinute: number;
  kind: WorkShiftKindDto;
};

type PlanningGridProps = {
  day: Date;
  employees: EmployeeDto[];
  shifts: WorkShiftDto[];
  recurringPatterns: RecurringPatternView[];
  /** Minutes travaillées de la semaine (lundi→dimanche) par employé. */
  weeklyWorkedMinutes: Map<string, number>;
  mode: PaintMode;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onCreate: (segment: PlanningSegmentInput) => void;
  onUpdate: (id: string, update: PlanningSegmentUpdate) => void;
  onDelete: (id: string) => void;
};

function minuteFromClientX(clientX: number, rect: DOMRect): number {
  const raw = ((clientX - rect.left) / rect.width) * DAY_MIN;
  const clamped = Math.max(0, Math.min(DAY_MIN, raw));
  return Math.round(clamped / SNAP) * SNAP;
}

function minutesInDay(iso: string, dayStartMs: number): number {
  return (new Date(iso).getTime() - dayStartMs) / MINUTE_MS;
}

function blockStyle(startMin: number, endMin: number) {
  return {
    left: `${(startMin / DAY_MIN) * 100}%`,
    width: `${((endMin - startMin) / DAY_MIN) * 100}%`,
  };
}

function kindColors(kind: WorkShiftKindDto, variant: "solid" | "ghost") {
  const isBreak = kind === "BREAK";
  if (variant === "ghost") {
    return isBreak
      ? "border-blue-500/70 bg-blue-400/25 border-dashed"
      : "border-green-600/70 bg-green-500/25 border-dashed";
  }
  return isBreak
    ? "border-blue-700 bg-blue-500"
    : "border-green-700 bg-green-500";
}

const HOURS = Array.from({ length: 25 }, (_, h) => h);

export function PlanningGrid({
  day,
  employees,
  shifts,
  recurringPatterns,
  weeklyWorkedMinutes,
  mode,
  canCreate,
  canUpdate,
  canDelete,
  onCreate,
  onUpdate,
  onDelete,
}: PlanningGridProps) {
  const dayStartMs = day.getTime();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [editPreview, setEditPreview] = useState<{
    shiftId: string;
    startMin: number;
    endMin: number;
  } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const shiftsByEmployee = new Map<string, WorkShiftDto[]>();
  for (const shift of shifts) {
    const list = shiftsByEmployee.get(shift.employeeId) ?? [];
    list.push(shift);
    shiftsByEmployee.set(shift.employeeId, list);
  }

  const recurringByEmployee = new Map<string, RecurringPatternView[]>();
  for (const pattern of recurringPatterns) {
    const list = recurringByEmployee.get(pattern.employeeId) ?? [];
    list.push(pattern);
    recurringByEmployee.set(pattern.employeeId, list);
  }

  const finishDrag = useCallback(() => {
    const current = dragRef.current;
    setDrag(null);
    if (!current) {
      return;
    }

    if (current.kind === "paint") {
      if (mode === "ERASE" || !canCreate) {
        return;
      }
      const startMin = Math.min(current.startMin, current.currentMin);
      const endMin = Math.max(current.startMin, current.currentMin);
      if (endMin - startMin < SNAP) {
        return;
      }
      onCreate({
        employeeId: current.employeeId,
        startAt: new Date(dayStartMs + startMin * MINUTE_MS).toISOString(),
        endAt: new Date(dayStartMs + endMin * MINUTE_MS).toISOString(),
        kind: mode,
      });
      return;
    }

    if (!editPreview) {
      return;
    }
    setEditPreview(null);
    const shift = shifts.find((s) => s.id === current.shiftId);
    if (!shift) {
      return;
    }
    const origStart = minutesInDay(shift.startAt, dayStartMs);
    const origEnd = minutesInDay(shift.endAt, dayStartMs);
    if (
      Math.round(editPreview.startMin) === Math.round(origStart) &&
      Math.round(editPreview.endMin) === Math.round(origEnd)
    ) {
      return;
    }
    onUpdate(current.shiftId, {
      startAt: new Date(
        dayStartMs + editPreview.startMin * MINUTE_MS,
      ).toISOString(),
      endAt: new Date(dayStartMs + editPreview.endMin * MINUTE_MS).toISOString(),
    });
  }, [
    mode,
    canCreate,
    dayStartMs,
    onCreate,
    editPreview,
    shifts,
    onUpdate,
  ]);

  useEffect(() => {
    if (!drag) {
      return;
    }
    const handleMove = (e: MouseEvent) => {
      const current = dragRef.current;
      if (!current) {
        return;
      }
      const min = minuteFromClientX(e.clientX, current.rect);

      if (current.kind === "paint") {
        setDrag({ ...current, currentMin: min });
        return;
      }

      let nextStart = current.origStartMin;
      let nextEnd = current.origEndMin;
      const delta = min - current.anchorMin;

      if (current.kind === "move") {
        const duration = current.origEndMin - current.origStartMin;
        nextStart = Math.max(
          0,
          Math.min(DAY_MIN - duration, current.origStartMin + delta),
        );
        nextEnd = nextStart + duration;
      } else if (current.kind === "resize-start") {
        nextStart = Math.max(0, Math.min(current.origEndMin - SNAP, min));
      } else {
        nextEnd = Math.min(
          DAY_MIN,
          Math.max(current.origStartMin + SNAP, min),
        );
      }

      setEditPreview({
        shiftId: current.shiftId,
        startMin: nextStart,
        endMin: nextEnd,
      });
    };

    const handleUp = () => finishDrag();
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [drag, finishDrag]);

  const paintable = canCreate && mode !== "ERASE";

  function handleTrackMouseDown(
    e: React.MouseEvent<HTMLDivElement>,
    employeeId: string,
  ) {
    if (!paintable || e.button !== 0) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const min = minuteFromClientX(e.clientX, rect);
    setDrag({
      kind: "paint",
      employeeId,
      rect,
      startMin: min,
      currentMin: min,
    });
  }

  function beginBlockEdit(
    e: React.MouseEvent,
    shift: WorkShiftDto,
    rect: DOMRect,
    editKind: BlockEditDrag["kind"],
  ) {
    if (!canUpdate || e.button !== 0) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    const startMin = minutesInDay(shift.startAt, dayStartMs);
    const endMin = minutesInDay(shift.endAt, dayStartMs);
    const anchorMin = minuteFromClientX(e.clientX, rect);
    setEditPreview({ shiftId: shift.id, startMin, endMin });
    setDrag({
      kind: editKind,
      shiftId: shift.id,
      rect,
      origStartMin: startMin,
      origEndMin: endMin,
      anchorMin,
    });
  }

  function resolveBlockBounds(shift: WorkShiftDto) {
    if (editPreview?.shiftId === shift.id) {
      return { startMin: editPreview.startMin, endMin: editPreview.endMin };
    }
    return {
      startMin: Math.max(0, minutesInDay(shift.startAt, dayStartMs)),
      endMin: Math.min(DAY_MIN, minutesInDay(shift.endAt, dayStartMs)),
    };
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <div className="min-w-[900px] select-none">
        <div className="flex border-b border-border bg-muted/40">
          <div className="flex w-44 shrink-0 items-center justify-between border-r border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
            <span>Employé</span>
            <span title="Heures travaillées cette semaine (remise à zéro lundi 00h)">
              Sem.
            </span>
          </div>
          <div className="relative h-8 flex-1">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute top-0 flex h-full items-center"
                style={{ left: `${(h / 24) * 100}%` }}
              >
                <span
                  className={cn(
                    "-translate-x-1/2 text-[10px] tabular-nums",
                    h % 2 === 0
                      ? "text-muted-foreground"
                      : "text-muted-foreground/40",
                  )}
                >
                  {h % 2 === 0 ? `${String(h).padStart(2, "0")}h` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="px-3 py-6 text-sm text-muted-foreground">
            Aucun employé à afficher.
          </div>
        ) : (
          employees.map((emp) => {
            const empShifts = shiftsByEmployee.get(emp.id) ?? [];
            const empRecurring = recurringByEmployee.get(emp.id) ?? [];
            const paintDrag =
              drag?.kind === "paint" && drag.employeeId === emp.id
                ? drag
                : null;
            const previewStart = paintDrag
              ? Math.min(paintDrag.startMin, paintDrag.currentMin)
              : 0;
            const previewEnd = paintDrag
              ? Math.max(paintDrag.startMin, paintDrag.currentMin)
              : 0;

            return (
              <div
                key={emp.id}
                className="flex border-b border-border/60 last:border-b-0"
              >
                <div className="flex w-44 shrink-0 items-center justify-between gap-2 border-r border-border px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {employeeDisplayName(emp)}
                    </div>
                    {emp.position ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {emp.position}
                      </div>
                    ) : null}
                  </div>
                  <span
                    title="Heures travaillées cette semaine"
                    className="shrink-0 rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-green-800"
                  >
                    {formatMinutesDuration(weeklyWorkedMinutes.get(emp.id) ?? 0)}
                  </span>
                </div>
                <div
                  className={cn(
                    "relative h-12 flex-1 bg-muted/30",
                    paintable ? "cursor-crosshair" : "cursor-default",
                  )}
                  onMouseDown={(e) => handleTrackMouseDown(e, emp.id)}
                >
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className={cn(
                        "absolute top-0 h-full w-px",
                        h % 6 === 0 ? "bg-border" : "bg-border/40",
                      )}
                      style={{ left: `${(h / 24) * 100}%` }}
                    />
                  ))}

                  {/* Modèles hebdomadaires (surcouche pointillée) */}
                  {empRecurring.map((pattern) => (
                    <div
                      key={pattern.id}
                      title={`Modèle hebdo · ${minutesToTime(pattern.startMinute)} – ${minutesToTime(
                        pattern.endMinute,
                      )} · ${pattern.kind === "BREAK" ? "Pause" : "Travail"}`}
                      className={cn(
                        "pointer-events-none absolute top-1 bottom-1 rounded-md border-2 text-[10px] font-medium",
                        kindColors(pattern.kind, "ghost"),
                        pattern.kind === "BREAK"
                          ? "text-blue-800"
                          : "text-green-800",
                      )}
                      style={blockStyle(pattern.startMinute, pattern.endMinute)}
                    >
                      <span className="block truncate px-1 leading-[2.2] opacity-80">
                        {minutesToTime(pattern.startMinute)}
                      </span>
                    </div>
                  ))}

                  {/* Créneaux concrets */}
                  {empShifts.map((shift) => {
                    const { startMin, endMin } = resolveBlockBounds(shift);
                    if (endMin <= startMin) {
                      return null;
                    }
                    const erasing = canDelete && mode === "ERASE";
                    const editable = canUpdate && !erasing;
                    const isBreak = shift.kind === "BREAK";

                    return (
                      <div
                        key={shift.id}
                        role="button"
                        tabIndex={0}
                        title={`${minutesToTime(Math.round(startMin))} – ${minutesToTime(
                          Math.round(endMin),
                        )} · ${isBreak ? "Pause" : "Travail"}`}
                        onMouseDown={(e) => {
                          if (erasing) {
                            e.stopPropagation();
                            return;
                          }
                          if (!editable) {
                            return;
                          }
                          const track = e.currentTarget
                            .parentElement as HTMLDivElement;
                          const blockRect = e.currentTarget.getBoundingClientRect();
                          const relX = e.clientX - blockRect.left;
                          const blockWidth = blockRect.width;
                          beginBlockEdit(
                            e,
                            shift,
                            track.getBoundingClientRect(),
                            relX <= HANDLE_PX
                              ? "resize-start"
                              : relX >= blockWidth - HANDLE_PX
                                ? "resize-end"
                                : "move",
                          );
                        }}
                        onClick={() => {
                          if (erasing) {
                            onDelete(shift.id);
                          }
                        }}
                        onKeyDown={() => {}}
                        className={cn(
                          "absolute top-1 bottom-1 rounded-md border text-[10px] font-medium text-white shadow-sm",
                          kindColors(shift.kind, "solid"),
                          erasing
                            ? "z-20 cursor-pointer hover:opacity-70 hover:ring-2 hover:ring-destructive"
                            : editable
                              ? "z-20 cursor-grab active:cursor-grabbing"
                              : "z-20 cursor-default",
                          editPreview?.shiftId === shift.id && "ring-2 ring-primary",
                        )}
                        style={blockStyle(startMin, endMin)}
                      >
                        {editable ? (
                          <>
                            <div
                              className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize rounded-l-md bg-black/15"
                              aria-hidden
                            />
                            <div
                              className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize rounded-r-md bg-black/15"
                              aria-hidden
                            />
                          </>
                        ) : null}
                        <span className="pointer-events-none block truncate px-2 leading-[2.2]">
                          {minutesToTime(Math.round(startMin))}
                        </span>
                      </div>
                    );
                  })}

                  {paintDrag && previewEnd > previewStart ? (
                    <div
                      className={cn(
                        "pointer-events-none absolute top-1 bottom-1 z-30 rounded-md border-2 border-dashed",
                        mode === "BREAK"
                          ? "border-blue-700 bg-blue-500/40"
                          : "border-green-700 bg-green-500/40",
                      )}
                      style={blockStyle(previewStart, previewEnd)}
                    />
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
