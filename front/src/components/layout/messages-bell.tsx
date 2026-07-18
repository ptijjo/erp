"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";

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
import type { MessageThreadSummaryDto } from "~/lib/api-types";

function displayName(c: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  const n = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  return n || c.email;
}

export function MessagesBell() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const canRead = me != null && hasMePermission(me, "read", "Message");

  const { data: threads = [] } = useQuery({
    queryKey: ["messaging", "threads"] as const,
    queryFn: async () => {
      const { data } = await api.get<MessageThreadSummaryDto[]>(
        "/messaging/threads",
      );
      return data;
    },
    enabled: canRead,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  const markRead = useMutation({
    mutationFn: async (threadId: string) => {
      await api.patch(`/messaging/threads/${threadId}/read`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messaging"] });
    },
  });

  if (!canRead) return null;

  const unreadThreads = threads.filter((t) => t.unread);
  const unreadCount = unreadThreads.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Messages"
        >
          <MessageSquare className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Messages</span>
          <Link
            href="/dashboard/messages"
            className="text-xs font-normal text-primary hover:underline"
          >
            Tout voir
          </Link>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {unreadThreads.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            Aucun message non lu.
          </p>
        ) : (
          unreadThreads.slice(0, 8).map((t) => (
            <DropdownMenuItem key={t.id} asChild>
              <Link
                href={`/dashboard/messages?thread=${t.id}`}
                className="flex w-full cursor-pointer flex-col items-start gap-1"
                onClick={() => markRead.mutate(t.id)}
              >
                <span className="font-medium">
                  {t.participants.map((p) => displayName(p)).join(", ")}
                </span>
                {t.lastMessage ? (
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {t.lastMessage.body}
                  </span>
                ) : null}
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
