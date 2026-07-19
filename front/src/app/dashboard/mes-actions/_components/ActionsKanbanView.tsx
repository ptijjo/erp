"use client";

import Link from "next/link";
import { ArrowUpRight, GripVertical } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  ActionOwnerCell,
  ActionPriorityPill,
  ActionProgressCell,
} from "~/app/dashboard/mes-actions/_components/ActionBoardCells";
import {
  KANBAN_COLUMNS,
  progressForStatus,
} from "~/app/dashboard/mes-actions/_lib/action-board";
import { formatActionDueDate } from "~/app/dashboard/mes-actions/_lib/action-labels";
import type {
  ActionItemDto,
  TaskPriorityDto,
  TaskStatusDto,
  TaskSubtaskDto,
} from "~/lib/api-types";
import { cn } from "~/lib/utils";

type ActionsKanbanViewProps = {
  actions: ActionItemDto[];
  canUpdate: boolean;
  onOpenTask: (action: ActionItemDto) => void;
  onStatusChange: (id: string, status: TaskStatusDto) => void;
  onSubtaskStatusChange: (
    taskId: string,
    subtaskId: string,
    status: TaskStatusDto,
  ) => void;
};

const DRAG_MIME = "application/x-vifaa-kanban-item";

type KanbanDragPayload =
  | { kind: "task"; taskId: string }
  | { kind: "subtask"; taskId: string; subtaskId: string };

type KanbanItem =
  | {
      key: string;
      kind: "task";
      status: TaskStatusDto;
      action: ActionItemDto;
      editable: boolean;
      priority: TaskPriorityDto;
      dueDate: string | null;
    }
  | {
      key: string;
      kind: "subtask";
      status: TaskStatusDto;
      action: ActionItemDto;
      subtask: TaskSubtaskDto;
      editable: boolean;
      priority: TaskPriorityDto;
      dueDate: string | null;
    };

function buildKanbanItems(actions: ActionItemDto[]): KanbanItem[] {
  const items: KanbanItem[] = [];

  for (const action of actions) {
    const subtasks = action.subtasks ?? [];
    if (subtasks.length > 0) {
      for (const subtask of subtasks) {
        items.push({
          key: `sub:${subtask.id}`,
          kind: "subtask",
          status: subtask.status,
          action,
          subtask,
          editable: action.editable,
          priority: subtask.priority,
          dueDate: subtask.dueDate ?? action.dueDate,
        });
      }
      continue;
    }

    items.push({
      key: `task:${action.id}`,
      kind: "task",
      status: action.status,
      action,
      editable: action.editable,
      priority: action.priority,
      dueDate: action.dueDate,
    });
  }

  return items;
}

function KanbanCard({
  item,
  canDrag,
  isDragging,
  onDragBegin,
  onOpen,
  onStatusChange,
}: {
  item: KanbanItem;
  canDrag: boolean;
  isDragging: boolean;
  onDragBegin: () => void;
  onOpen: () => void;
  onStatusChange: (status: TaskStatusDto) => void;
}) {
  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    onDragBegin();
    const payload: KanbanDragPayload =
      item.kind === "task"
        ? { kind: "task", taskId: item.action.id }
        : {
            kind: "subtask",
            taskId: item.action.id,
            subtaskId: item.subtask.id,
          };
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const title = item.kind === "task" ? item.action.title : item.subtask.title;
  const isDone = item.status === "DONE";

  return (
    <article
      draggable={canDrag}
      onDragStart={handleDragStart}
      onClick={onOpen}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md",
        item.action.kind === "SYSTEM" && "border-violet-200/80",
        item.kind === "subtask" && "border-l-4 border-l-sky-400",
        canDrag && "cursor-grab active:cursor-grabbing",
        isDragging && "scale-[0.98] opacity-40",
        "cursor-pointer",
      )}
    >
      <div className="mb-2 flex items-start gap-1.5">
        {canDrag && (
          <GripVertical className="text-muted-foreground mt-0.5 size-4 shrink-0 opacity-50" />
        )}
        <div className="min-w-0 flex-1">
          {item.kind === "subtask" ? (
            <p className="text-muted-foreground mb-0.5 truncate text-[10px] font-medium uppercase tracking-wide">
              {item.action.title}
            </p>
          ) : null}
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm leading-snug font-medium",
                isDone && "text-muted-foreground line-through",
              )}
            >
              {title}
            </p>
            {item.kind === "task" && item.action.href ? (
              <Link
                href={item.action.href}
                className="text-muted-foreground hover:text-primary shrink-0"
                aria-label="Ouvrir"
                onClick={(e) => e.stopPropagation()}
              >
                <ArrowUpRight className="size-4" />
              </Link>
            ) : null}
          </div>
          {item.kind === "task" && item.action.description ? (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              {item.action.description}
            </p>
          ) : null}
        </div>
      </div>
      {item.kind === "task" ? (
        <ActionProgressCell action={item.action} />
      ) : (
        <div className="flex items-center gap-2">
          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progressForStatus(item.status)}%` }}
            />
          </div>
          <span className="text-muted-foreground text-[10px]">Sous-tâche</span>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <ActionOwnerCell action={item.action} />
        <ActionPriorityPill priority={item.priority} />
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        {formatActionDueDate(item.dueDate)}
      </p>
      {item.editable && canDrag && item.status !== "DONE" ? (
        <div
          className="mt-3 flex gap-1 border-t pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          {item.status === "TODO" ? (
            <button
              type="button"
              className="text-primary text-xs hover:underline"
              onClick={() => onStatusChange("IN_PROGRESS")}
            >
              Démarrer
            </button>
          ) : null}
          {item.status === "IN_PROGRESS" ? (
            <button
              type="button"
              className="text-emerald-700 text-xs hover:underline"
              onClick={() => onStatusChange("DONE")}
            >
              Terminer
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function ActionsKanbanView({
  actions,
  canUpdate,
  onOpenTask,
  onStatusChange,
  onSubtaskStatusChange,
}: ActionsKanbanViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatusDto | null>(null);

  const items = useMemo(() => buildKanbanItems(actions), [actions]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
  }, []);

  const handleColumnDragOver = (
    e: React.DragEvent,
    status: TaskStatusDto,
  ) => {
    if (!canUpdate) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(status);
  };

  const handleColumnDrop = (e: React.DragEvent, status: TaskStatusDto) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw || !canUpdate) {
      handleDragEnd();
      return;
    }

    let payload: KanbanDragPayload;
    try {
      payload = JSON.parse(raw) as KanbanDragPayload;
    } catch {
      handleDragEnd();
      return;
    }

    if (payload.kind === "task") {
      const action = actions.find((a) => a.id === payload.taskId);
      if (!action?.editable || action.status === status) {
        handleDragEnd();
        return;
      }
      onStatusChange(payload.taskId, status);
    } else {
      const action = actions.find((a) => a.id === payload.taskId);
      const sub = action?.subtasks?.find((s) => s.id === payload.subtaskId);
      if (!action?.editable || !sub || sub.status === status) {
        handleDragEnd();
        return;
      }
      onSubtaskStatusChange(payload.taskId, payload.subtaskId, status);
    }

    handleDragEnd();
  };

  return (
    <div className="grid gap-4 md:grid-cols-3" onDragEnd={handleDragEnd}>
      {KANBAN_COLUMNS.map((col) => {
        const colItems = items.filter((i) => i.status === col.status);
        const avgProgress =
          colItems.length === 0
            ? 0
            : Math.round(
                colItems.reduce(
                  (s, i) => s + progressForStatus(i.status),
                  0,
                ) / colItems.length,
              );
        const isDropActive = dropTarget === col.status && draggingId != null;

        return (
          <div
            key={col.status}
            className={cn(
              "flex flex-col rounded-xl border transition-colors",
              col.headerClass,
              isDropActive && "ring-primary ring-2 ring-offset-2",
            )}
            onDragOver={(e) => handleColumnDragOver(e, col.status)}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(e) => handleColumnDrop(e, col.status)}
          >
            <header className="flex items-center justify-between border-b border-inherit px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <p className="text-muted-foreground text-xs">
                  {colItems.length} carte{colItems.length !== 1 ? "s" : ""}
                  {canUpdate && " · glisser-déposer"}
                </p>
              </div>
              <span className="text-muted-foreground text-xs tabular-nums">
                ~{avgProgress}%
              </span>
            </header>
            <div
              className={cn(
                "flex min-h-[200px] flex-1 flex-col gap-2 p-3 transition-colors",
                isDropActive && "bg-primary/5",
              )}
            >
              {colItems.length === 0 ? (
                <p
                  className={cn(
                    "text-muted-foreground rounded-lg border border-dashed py-8 text-center text-xs",
                    isDropActive && "border-primary bg-primary/5 text-primary",
                  )}
                >
                  {isDropActive ? "Relâcher ici" : "Aucune carte"}
                </p>
              ) : (
                colItems.map((item) => {
                  const canDrag = canUpdate && item.editable;
                  return (
                    <KanbanCard
                      key={item.key}
                      item={item}
                      canDrag={canDrag}
                      isDragging={draggingId === item.key}
                      onDragBegin={() => setDraggingId(item.key)}
                      onOpen={() => onOpenTask(item.action)}
                      onStatusChange={(status) => {
                        if (item.kind === "task") {
                          onStatusChange(item.action.id, status);
                        } else {
                          onSubtaskStatusChange(
                            item.action.id,
                            item.subtask.id,
                            status,
                          );
                        }
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
