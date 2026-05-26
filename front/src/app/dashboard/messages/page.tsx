"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Send } from "lucide-react";

import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type {
  MessageDto,
  MessageThreadSummaryDto,
  MessagingContactDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";

function displayName(c: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  const n = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  return n || c.email;
}

export default function MessagesPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const threadFromUrl = searchParams.get("thread");
  const canRead = me != null && hasMePermission(me, "read", "Message");
  const canSend = me != null && hasMePermission(me, "create", "Message");

  const [localThreadId, setLocalThreadId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeTo, setComposeTo] = useState<MessagingContactDto | null>(null);

  const { data: threads = [] } = useQuery({
    queryKey: ["messaging", "threads"] as const,
    queryFn: async () => {
      const { data } = await api.get<MessageThreadSummaryDto[]>(
        "/messaging/threads",
      );
      return data;
    },
    enabled: canRead,
  });

  const urlThreadValid =
    threadFromUrl != null &&
    threadFromUrl.length > 0 &&
    threads.some((t) => t.id === threadFromUrl);
  const selectedThreadId = urlThreadValid ? threadFromUrl : localThreadId;

  const { data: messages = [] } = useQuery({
    queryKey: ["messaging", "messages", selectedThreadId] as const,
    queryFn: async () => {
      const { data } = await api.get<MessageDto[]>(
        `/messaging/threads/${selectedThreadId}/messages`,
      );
      return data;
    },
    enabled: Boolean(selectedThreadId && canRead),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["messaging", "contacts", contactSearch] as const,
    queryFn: async () => {
      const { data } = await api.get<MessagingContactDto[]>(
        "/messaging/contacts",
        { params: { q: contactSearch } },
      );
      return data;
    },
    enabled: canRead && contactSearch.trim().length >= 2,
  });

  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );

  useEffect(() => {
    if (!selectedThreadId) return;
    void api.patch(`/messaging/threads/${selectedThreadId}/read`);
    void queryClient.invalidateQueries({ queryKey: ["messaging", "threads"] });
  }, [selectedThreadId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedThreadId) return;
      const { data } = await api.post<MessageDto>(
        `/messaging/threads/${selectedThreadId}/messages`,
        { body: newMessage },
      );
      return data;
    },
    onSuccess: () => {
      setNewMessage("");
      void queryClient.invalidateQueries({ queryKey: ["messaging"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Envoi impossible"));
    },
  });

  const composeMutation = useMutation({
    mutationFn: async () => {
      if (!composeTo) throw new Error("Destinataire requis");
      const { data } = await api.post<{ thread: MessageThreadSummaryDto }>(
        "/messaging/threads",
        { recipientUserId: composeTo.id, body: composeBody },
      );
      return data.thread;
    },
    onSuccess: (thread) => {
      setComposeBody("");
      setComposeTo(null);
      setContactSearch("");
      setLocalThreadId(thread.id);
      void queryClient.invalidateQueries({ queryKey: ["messaging"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Conversation impossible"));
    },
  });

  const openThread = (id: string) => {
    setLocalThreadId(id);
  };

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Messagerie"
          description="Vous n’avez pas accès à la messagerie interne."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Messagerie interne"
        description="Filiales, maison mère et échanges intra-pôle. Inter-pôles : directeurs de pôle, DG et direction opérations."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-3 min-h-[480px]">
        <aside className="rounded-xl border bg-card p-3 space-y-3 lg:col-span-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Conversations
          </p>
          <ul className="max-h-64 overflow-y-auto divide-y">
            {threads.length === 0 ? (
              <li className="py-3 text-sm text-muted-foreground">
                Aucune conversation.
              </li>
            ) : (
              threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`w-full py-2 text-left text-sm hover:bg-muted/50 px-1 rounded ${
                      selectedThreadId === t.id
                        ? "bg-muted font-medium"
                        : t.unread
                          ? "bg-primary/5"
                          : ""
                    }`}
                    onClick={() => openThread(t.id)}
                  >
                    <span className="block truncate">
                      {t.participants.map((p) => displayName(p)).join(", ")}
                    </span>
                    {t.lastMessage ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.lastMessage.body}
                      </span>
                    ) : null}
                    {t.unread ? (
                      <span className="text-xs text-primary">Non lu</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>

          {canSend ? (
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Nouveau message
              </p>
              <Input
                placeholder="Rechercher un contact (2 car. min.)"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
              {contacts.length > 0 ? (
                <ul className="max-h-32 overflow-y-auto text-sm divide-y">
                  {contacts.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full py-1.5 text-left hover:bg-muted/50 px-1"
                        onClick={() => setComposeTo(c)}
                      >
                        {displayName(c)}
                        <span className="block text-xs text-muted-foreground">
                          {c.organization.name}
                          {c.role.pole ? ` · ${c.role.pole.name}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {composeTo ? (
                <p className="text-sm">
                  À : <strong>{displayName(composeTo)}</strong>
                </p>
              ) : null}
              <textarea
                className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Premier message…"
              />
              <Button
                className="w-full"
                size="sm"
                disabled={
                  !composeTo ||
                  !composeBody.trim() ||
                  composeMutation.isPending
                }
                onClick={() => composeMutation.mutate()}
              >
                Démarrer la conversation
              </Button>
            </div>
          ) : null}
        </aside>

        <section className="rounded-xl border bg-card p-4 lg:col-span-2 flex flex-col">
          {!selectedThread ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <MessageSquare className="mr-2 size-5" />
              Sélectionnez ou démarrez une conversation
            </div>
          ) : (
            <>
              <div className="border-b pb-2 mb-3">
                <p className="font-medium">
                  {selectedThread.participants
                    .map((p) => displayName(p))
                    .join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedThread.scope.replaceAll("_", " ")}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 min-h-[280px] max-h-[360px]">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                      m.sender.id === me?.sub
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-xs opacity-80 mb-0.5">
                      {displayName(m.sender)}
                    </p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>
              {canSend ? (
                <form
                  className="mt-3 flex gap-2 items-end"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMutation.mutate();
                  }}
                >
                  <div className="flex-1">
                    <Label htmlFor="reply" className="sr-only">
                      Réponse
                    </Label>
                    <textarea
                      id="reply"
                      className="w-full min-h-[64px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!newMessage.trim() || sendMutation.isPending}
                  >
                    <Send className="size-4" />
                  </Button>
                </form>
              ) : null}
            </>
          )}
        </section>
      </div>
    </PageShell>
  );
}
