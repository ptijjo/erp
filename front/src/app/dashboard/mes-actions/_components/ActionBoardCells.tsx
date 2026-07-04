"use client";

import Link from "next/link";
import { ArrowUpRight, Bot, MoreHorizontal, Trash2 } from "lucide-react";

import {
  PRIORITY_PILL_CLASS,
  STATUS_PILL_CLASS,
  formatShortDueDate,
  progressForStatus,
} from "~/app/dashboard/mes-actions/_lib/action-board";
import {
  ACTION_KIND_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from "~/app/dashboard/mes-actions/_lib/action-labels";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useMe } from "~/hooks/use-me";
import type { ActionItemDto, TaskStatusDto } from "~/lib/api-types";
import { cn } from "~/lib/utils";

type ActionProgressCellProps = {
  status: TaskStatusDto;
};

export function ActionProgressCell({ status }: ActionProgressCellProps) {
  const value = progressForStatus(status);
  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">
        {value}%
      </span>
    </div>
  );
}

type ActionStatusPillProps = {
  status: TaskStatusDto;
  className?: string;
};

export function ActionStatusPill({ status, className }: ActionStatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[88px] items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium",
        STATUS_PILL_CLASS[status],
        className,
      )}
    >
      {TASK_STATUS_LABEL[status]}
    </span>
  );
}

type ActionPriorityPillProps = {
  priority: ActionItemDto["priority"];
};

export function ActionPriorityPill({ priority }: ActionPriorityPillProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[72px] items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium",
        PRIORITY_PILL_CLASS[priority],
      )}
    >
      {TASK_PRIORITY_LABEL[priority]}
    </span>
  );
}

function emailInitials(email: string) {
  const local = email.split("@")[0] ?? email;
  return local.slice(0, 2).toUpperCase();
}

type ActionOwnerCellProps = {
  action: ActionItemDto;
};

export function ActionOwnerCell({ action }: ActionOwnerCellProps) {
  const { data: me } = useMe();

  if (action.kind === "SYSTEM") {
    return (
      <div className="flex items-center gap-1.5">
        <Avatar size="sm">
          <AvatarFallback className="bg-violet-100 text-violet-700 text-[10px]">
            <Bot className="size-3.5" />
          </AvatarFallback>
        </Avatar>
        <span className="text-muted-foreground hidden text-xs lg:inline">
          ERP
        </span>
      </div>
    );
  }

  const initials = me?.email ? emailInitials(me.email) : "?";
  return (
    <Avatar size="sm" title={me?.email ?? "Moi"}>
      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

type ActionRowMenuProps = {
  action: ActionItemDto;
  canUpdate: boolean;
  canDelete: boolean;
  onStatusChange: (status: TaskStatusDto) => void;
  onDelete: () => void;
};

export function ActionRowMenu({
  action,
  canUpdate,
  canDelete,
  onStatusChange,
  onDelete,
}: ActionRowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
          aria-label="Actions"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {action.href && (
          <DropdownMenuItem asChild>
            <Link href={action.href}>
              Ouvrir le module
              <ArrowUpRight className="ml-auto size-3.5" />
            </Link>
          </DropdownMenuItem>
        )}
        {action.editable && canUpdate && (
          <>
            {action.status !== "TODO" && (
              <DropdownMenuItem onClick={() => onStatusChange("TODO")}>
                Marquer en attente
              </DropdownMenuItem>
            )}
            {action.status !== "IN_PROGRESS" && (
              <DropdownMenuItem onClick={() => onStatusChange("IN_PROGRESS")}>
                Marquer en cours
              </DropdownMenuItem>
            )}
            {action.status !== "DONE" && (
              <DropdownMenuItem onClick={() => onStatusChange("DONE")}>
                Marquer fait
              </DropdownMenuItem>
            )}
          </>
        )}
        {action.editable && canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
              Supprimer
            </DropdownMenuItem>
          </>
        )}
        {!action.editable && (
          <DropdownMenuItem disabled>
            {ACTION_KIND_LABEL.SYSTEM} — lecture seule
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ActionDueDateCell({
  dueDate,
  status,
}: {
  dueDate: string | null;
  status: TaskStatusDto;
}) {
  return (
    <span
      className={cn(
        "text-sm tabular-nums",
        dueDate && status !== "DONE" && "font-medium",
      )}
    >
      {formatShortDueDate(dueDate)}
    </span>
  );
}
