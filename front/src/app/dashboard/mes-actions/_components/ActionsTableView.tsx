"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, ListTree, Plus } from "lucide-react";
import { useState } from "react";

import type { ActionGroup } from "~/app/dashboard/mes-actions/_lib/action-board";
import {
  ActionDueDateCell,
  ActionOwnerCell,
  ActionPriorityPill,
  ActionProgressCell,
  ActionRowMenu,
  ActionStatusPill,
} from "~/app/dashboard/mes-actions/_components/ActionBoardCells";
import { ACTION_KIND_LABEL } from "~/app/dashboard/mes-actions/_lib/action-labels";
import { Button } from "~/components/ui/button";
import type { ActionItemDto, TaskStatusDto } from "~/lib/api-types";
import { cn } from "~/lib/utils";

type ActionsTableViewProps = {
  groups: ActionGroup[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onAddTask: (groupId: ActionGroup["id"]) => void;
  onStatusChange: (id: string, status: TaskStatusDto) => void;
  onDelete: (id: string) => void;
  onOpenTask?: (action: ActionItemDto) => void;
};

function ActionTableRow({
  action,
  canUpdate,
  canDelete,
  onStatusChange,
  onDelete,
  onOpenTask,
}: {
  action: ActionItemDto;
  canUpdate: boolean;
  canDelete: boolean;
  onStatusChange: (status: TaskStatusDto) => void;
  onDelete: () => void;
  onOpenTask?: () => void;
}) {
  return (
    <tr
      className={cn(
        "group border-b border-border/60 transition-colors hover:bg-muted/30",
        action.status === "DONE" && "opacity-70",
      )}
    >
      <td className="w-10 px-2 py-2">
        <input
          type="checkbox"
          checked={action.status === "DONE"}
          disabled={!action.editable || !canUpdate}
          onChange={() =>
            onStatusChange(action.status === "DONE" ? "TODO" : "DONE")
          }
          className="accent-primary size-4 rounded border-input"
          aria-label={`Marquer ${action.title} comme fait`}
        />
      </td>
      <td className="min-w-[220px] px-3 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {action.kind === "MANUAL" && onOpenTask ? (
            <button
              type="button"
              onClick={onOpenTask}
              className={cn(
                "truncate text-left text-sm font-medium text-primary hover:underline",
                action.status === "DONE" &&
                  "text-muted-foreground line-through",
              )}
            >
              {action.title}
            </button>
          ) : (
            <span
              className={cn(
                "truncate text-sm font-medium",
                action.status === "DONE" &&
                  "text-muted-foreground line-through",
              )}
            >
              {action.title}
            </span>
          )}
          {action.kind === "SYSTEM" && (
            <span className="bg-violet-100 text-violet-700 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
              {ACTION_KIND_LABEL.SYSTEM}
            </span>
          )}
          {action.subtaskProgress && action.subtaskProgress.total > 0 ? (
            <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
              {action.subtaskProgress.done}/{action.subtaskProgress.total}
            </span>
          ) : null}
          {action.kind === "MANUAL" && onOpenTask ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 shrink-0 gap-1 px-2 text-xs"
              onClick={onOpenTask}
            >
              <ListTree className="size-3.5" />
              Sous-tâches
            </Button>
          ) : null}
          {action.href && (
            <Link
              href={action.href}
              className="text-primary shrink-0 text-xs opacity-0 group-hover:opacity-100 hover:underline"
            >
              Ouvrir
            </Link>
          )}
        </div>
        {action.description && (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {action.description}
          </p>
        )}
      </td>
      <td className="hidden px-3 py-2.5 md:table-cell">
        <ActionOwnerCell action={action} />
      </td>
      <td className="hidden px-3 py-2.5 lg:table-cell">
        <ActionProgressCell action={action} />
      </td>
      <td className="px-3 py-2.5">
        {action.editable && canUpdate ? (
          <button
            type="button"
            className="cursor-pointer"
            onClick={() => {
              const next: TaskStatusDto =
                action.status === "TODO"
                  ? "IN_PROGRESS"
                  : action.status === "IN_PROGRESS"
                    ? "DONE"
                    : "TODO";
              onStatusChange(next);
            }}
          >
            <ActionStatusPill status={action.status} />
          </button>
        ) : (
          <ActionStatusPill status={action.status} />
        )}
      </td>
      <td className="hidden px-3 py-2.5 sm:table-cell">
        <ActionPriorityPill priority={action.priority} />
      </td>
      <td className="hidden px-3 py-2.5 sm:table-cell">
        <ActionDueDateCell
          startDate={action.startDate}
          dueDate={action.dueDate}
          status={action.status}
        />
      </td>
      <td className="w-10 px-1 py-2">
        <ActionRowMenu
          action={action}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onOpenSubtasks={onOpenTask}
        />
      </td>
    </tr>
  );
}

function ActionGroupSection({
  group,
  canCreate,
  canUpdate,
  canDelete,
  onAddTask,
  onStatusChange,
  onDelete,
  onOpenTask,
}: {
  group: ActionGroup;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onAddTask: () => void;
  onStatusChange: (id: string, status: TaskStatusDto) => void;
  onDelete: (id: string) => void;
  onOpenTask?: (action: ActionItemDto) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <button
        type="button"
        className="flex w-full items-center gap-3 border-b bg-muted/20 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className={cn("h-8 w-1 shrink-0 rounded-full", group.accentClass)} />
        {collapsed ? (
          <ChevronRight className="text-muted-foreground size-4" />
        ) : (
          <ChevronDown className="text-muted-foreground size-4" />
        )}
        <span className="text-sm font-semibold">{group.label}</span>
        <span className="text-muted-foreground text-xs">
          {group.items.length} élément{group.items.length > 1 ? "s" : ""}
        </span>
      </button>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b bg-muted/10 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                <th className="w-10 px-2 py-2" />
                <th className="px-3 py-2">Élément</th>
                <th className="hidden px-3 py-2 md:table-cell">Responsable</th>
                <th className="hidden px-3 py-2 lg:table-cell">Progression</th>
                <th className="px-3 py-2">Statut</th>
                <th className="hidden px-3 py-2 sm:table-cell">Priorité</th>
                <th className="hidden px-3 py-2 sm:table-cell">Date</th>
                <th className="w-10 px-1 py-2" />
              </tr>
            </thead>
            <tbody>
              {group.items.map((action) => (
                <ActionTableRow
                  key={action.id}
                  action={action}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onStatusChange={(status) => onStatusChange(action.id, status)}
                  onDelete={() => onDelete(action.id)}
                  onOpenTask={
                    onOpenTask ? () => onOpenTask(action) : undefined
                  }
                />
              ))}
              {canCreate && (
                <tr className="border-t border-dashed">
                  <td colSpan={8} className="px-3 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground h-8 gap-1.5 px-2"
                      onClick={onAddTask}
                    >
                      <Plus className="size-4" />
                      Ajouter une tâche
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function ActionsTableView({
  groups,
  canCreate,
  canUpdate,
  canDelete,
  onAddTask,
  onStatusChange,
  onDelete,
  onOpenTask,
}: ActionsTableViewProps) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <ActionGroupSection
          key={group.id}
          group={group}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onAddTask={() => onAddTask(group.id)}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onOpenTask={onOpenTask}
        />
      ))}
    </div>
  );
}
