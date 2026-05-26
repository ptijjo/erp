"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { NotificationDto } from "~/lib/api-types";

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "À l’instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function NotificationsBell() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const canRead = me != null && hasMePermission(me, "read", "Notification");
  const canUpdate = me != null && hasMePermission(me, "update", "Notification");

  const { data: items = [], isFetching } = useQuery({
    queryKey: ["notifications"] as const,
    queryFn: async () => {
      const { data } = await api.get<NotificationDto[]>("/notifications", {
        params: { unreadOnly: "true" },
      });
      return data;
    },
    enabled: canRead,
    refetchInterval: 120_000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.post("/notifications/read-all");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (!canRead) return null;

  const unread = items.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>
          {canUpdate && unread > 0 ? (
            <button
              type="button"
              className="text-xs font-normal text-primary hover:underline disabled:opacity-50"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Tout marquer lu
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isFetching && items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            Chargement…
          </p>
        ) : items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            Aucune alerte non lue.
          </p>
        ) : (
          items.slice(0, 10).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex flex-col items-start gap-1"
              onClick={() => markRead.mutate(n.id)}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="font-medium">{n.title}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatRelativeTime(n.createdAt)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground line-clamp-2">
                {n.body}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
