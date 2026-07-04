"use client";

import Link from "next/link";
import { ArrowUpRight, GripVertical } from "lucide-react";
import { useCallback, useState } from "react";

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
import type { ActionItemDto, TaskStatusDto } from "~/lib/api-types";
import { cn } from "~/lib/utils";

type ActionsKanbanViewProps = {
  actions: ActionItemDto[];
  canUpdate: boolean;
  onStatusChange: (id: string, status: TaskStatusDto) => void;
};

const DRAG_MIME = "application/x-vifaa-action-id";

function KanbanCard({
  action,
  canDrag,
  isDragging,
  onDragBegin,
  onStatusChange,
}: {
  action: ActionItemDto;
  canDrag: boolean;
  isDragging: boolean;
  onDragBegin: () => void;
  onStatusChange: (status: TaskStatusDto) => void;
}) {
  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
    onDragBegin();
    e.dataTransfer.setData(DRAG_MIME, action.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <article
      draggable={canDrag}
      onDragStart={handleDragStart}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md",
        action.kind === "SYSTEM" && "border-violet-200/80",
        canDrag && "cursor-grab active:cursor-grabbing",
        isDragging && "scale-[0.98] opacity-40",
      )}
    >
      <div className="mb-2 flex items-start gap-1.5">
        {canDrag && (
          <GripVertical className="text-muted-foreground mt-0.5 size-4 shrink-0 opacity-50" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm leading-snug font-medium",
                action.status === "DONE" && "text-muted-foreground line-through",
              )}
            >
              {action.title}
            </p>
            {action.href && (
              <Link
                href={action.href}
                className="text-muted-foreground hover:text-primary shrink-0"
                aria-label="Ouvrir"
                onClick={(e) => e.stopPropagation()}
              >
                <ArrowUpRight className="size-4" />
              </Link>
            )}
          </div>
          {action.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              {action.description}
            </p>
          )}
        </div>
      </div>
      <ActionProgressCell status={action.status} />
      <div className="mt-3 flex items-center justify-between gap-2">
        <ActionOwnerCell action={action} />
        <ActionPriorityPill priority={action.priority} />
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        {formatActionDueDate(action.dueDate)}
      </p>
      {action.editable && canDrag && action.status !== "DONE" && (
        <div className="mt-3 flex gap-1 border-t pt-2">
          {action.status === "TODO" && (
            <button
              type="button"
              className="text-primary text-xs hover:underline"
              onClick={() => onStatusChange("IN_PROGRESS")}
            >
              Démarrer
            </button>
          )}
          {action.status === "IN_PROGRESS" && (
            <button
              type="button"
              className="text-emerald-700 text-xs hover:underline"
              onClick={() => onStatusChange("DONE")}
            >
              Terminer
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function ActionsKanbanView({
  actions,
  canUpdate,
  onStatusChange,
}: ActionsKanbanViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatusDto | null>(null);

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
    const id = e.dataTransfer.getData(DRAG_MIME);
    if (!id || !canUpdate) {
      handleDragEnd();
      return;
    }

    const action = actions.find((a) => a.id === id);
    if (!action?.editable || action.status === status) {
      handleDragEnd();
      return;
    }

    onStatusChange(id, status);
    handleDragEnd();
  };

  return (
    <div
      className="grid gap-4 md:grid-cols-3"
      onDragEnd={handleDragEnd}
    >
      {KANBAN_COLUMNS.map((col) => {
        const items = actions.filter((a) => a.status === col.status);
        const avgProgress =
          items.length === 0
            ? 0
            : Math.round(
                items.reduce((s, a) => s + progressForStatus(a.status), 0) /
                  items.length,
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
                  {items.length} action{items.length !== 1 ? "s" : ""}
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
              {items.length === 0 ? (
                <p
                  className={cn(
                    "text-muted-foreground rounded-lg border border-dashed py-8 text-center text-xs",
                    isDropActive && "border-primary bg-primary/5 text-primary",
                  )}
                >
                  {isDropActive ? "Relâcher ici" : "Aucune action"}
                </p>
              ) : (
                items.map((action) => {
                  const canDrag = canUpdate && action.editable;
                  return (
                    <KanbanCard
                      key={action.id}
                      action={action}
                      canDrag={canDrag}
                      isDragging={draggingId === action.id}
                      onDragBegin={() => setDraggingId(action.id)}
                      onStatusChange={(status) =>
                        onStatusChange(action.id, status)
                      }
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
