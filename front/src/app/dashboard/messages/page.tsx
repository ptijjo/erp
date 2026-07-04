"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  PenSquare,
  Search,
  Send,
  Users,
} from "lucide-react";

import { ContactAvatar } from "./_components/ContactAvatar";
import {
  displayName,
  formatMessageTime,
  formatScopeLabel,
  threadTitle,
} from "./_lib/messaging-display";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type {
  MessageDto,
  MessageThreadSummaryDto,
  MessagingContactDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { cn } from "~/lib/utils";

type MainView = "empty" | "compose" | "thread";

export default function MessagesPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const threadFromUrl = searchParams.get("thread");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canRead = me != null && hasMePermission(me, "read", "Message");
  const canSend = me != null && hasMePermission(me, "create", "Message");

  const [localThreadId, setLocalThreadId] = useState<string | null>(null);
  const [mainView, setMainView] = useState<MainView>("empty");
  const [threadSearch, setThreadSearch] = useState("");
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

  const activeView: MainView = selectedThreadId
    ? "thread"
    : mainView === "compose"
      ? "compose"
      : "empty";

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
    enabled: canRead && activeView === "compose" && contactSearch.trim().length >= 2,
  });

  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );

  const filteredThreads = useMemo(() => {
    const q = threadSearch.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const names = t.participants
        .map((p) => {
          const label = displayName(p).toLowerCase();
          const first = p.firstName?.trim().toLowerCase() ?? "";
          const last = p.lastName?.trim().toLowerCase() ?? "";
          return `${label} ${first} ${last}`.trim();
        })
        .join(" ");
      const preview = t.lastMessage?.body.toLowerCase() ?? "";
      return names.includes(q) || preview.includes(q);
    });
  }, [threads, threadSearch]);

  const unreadCount = threads.filter((t) => t.unread).length;

  useEffect(() => {
    if (!selectedThreadId) return;
    void api.patch(`/messaging/threads/${selectedThreadId}/read`);
    void queryClient.invalidateQueries({ queryKey: ["messaging", "threads"] });
  }, [selectedThreadId, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedThreadId]);

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
      setMainView("empty");
      void queryClient.invalidateQueries({ queryKey: ["messaging"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Conversation impossible"));
    },
  });

  const openThread = (id: string) => {
    setMainView("empty");
    setLocalThreadId(id);
  };

  const startCompose = () => {
    setLocalThreadId(null);
    setComposeTo(null);
    setComposeBody("");
    setContactSearch("");
    setMainView("compose");
  };

  const backToList = () => {
    setLocalThreadId(null);
    setMainView("empty");
  };

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Messagerie"
          description="Vous n'avez pas accès à la messagerie interne."
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

      <div className="mt-6 flex h-[min(720px,calc(100vh-220px))] min-h-[480px] overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Liste des conversations */}
        <aside className="flex w-full max-w-sm shrink-0 flex-col border-r bg-muted/20 lg:w-80">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Conversations</h2>
              {unreadCount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
                </p>
              ) : null}
            </div>
            {canSend ? (
              <Button
                type="button"
                size="sm"
                variant={activeView === "compose" ? "secondary" : "default"}
                className="shrink-0 gap-1.5"
                onClick={startCompose}
              >
                <PenSquare className="size-4" />
                Nouveau
              </Button>
            ) : null}
          </div>

          <div className="border-b px-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nom, prénom ou message…"
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                className="h-9 bg-background pl-8"
              />
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                {threads.length === 0
                  ? "Aucune conversation pour le moment."
                  : "Aucun résultat pour cette recherche."}
              </li>
            ) : (
              filteredThreads.map((t) => {
                const peer = t.participants[0];
                const isActive =
                  activeView === "thread" && selectedThreadId === t.id;

                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/60",
                        isActive && "bg-muted",
                        t.unread && !isActive && "bg-primary/5",
                      )}
                      onClick={() => openThread(t.id)}
                    >
                      {peer ? (
                        <ContactAvatar contact={peer} className="mt-0.5" />
                      ) : (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <Users className="size-4 text-muted-foreground" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              t.unread ? "font-semibold" : "font-medium",
                            )}
                          >
                            {threadTitle(t.participants)}
                          </span>
                          {t.lastMessage ? (
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {formatMessageTime(t.lastMessage.createdAt)}
                            </span>
                          ) : null}
                        </div>
                        {t.lastMessage ? (
                          <p
                            className={cn(
                              "mt-0.5 truncate text-xs",
                              t.unread
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {t.lastMessage.body}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs text-muted-foreground italic">
                            Conversation vide
                          </p>
                        )}
                      </div>
                      {t.unread ? (
                        <span
                          className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                          aria-label="Non lu"
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        {/* Panneau principal */}
        <section className="flex min-w-0 flex-1 flex-col bg-background">
          {activeView === "compose" && canSend ? (
            <ComposePanel
              contactSearch={contactSearch}
              onContactSearchChange={setContactSearch}
              contacts={contacts}
              composeTo={composeTo}
              onSelectContact={setComposeTo}
              composeBody={composeBody}
              onComposeBodyChange={setComposeBody}
              onBack={backToList}
              onSubmit={() => composeMutation.mutate()}
              isPending={composeMutation.isPending}
            />
          ) : activeView === "thread" && selectedThread ? (
            <>
              <header className="flex items-center gap-3 border-b px-4 py-3">
                {selectedThread.participants[0] ? (
                  <ContactAvatar contact={selectedThread.participants[0]} />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {threadTitle(selectedThread.participants)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground capitalize">
                    {formatScopeLabel(selectedThread.scope)}
                  </p>
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Aucun message. Envoyez le premier.
                  </p>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender.id === me?.sub;
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex",
                          isMine ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                            isMine
                              ? "rounded-br-md bg-primary text-primary-foreground"
                              : "rounded-bl-md bg-muted",
                          )}
                        >
                          {!isMine ? (
                            <p className="mb-0.5 text-[11px] font-medium opacity-80">
                              {displayName(m.sender)}
                            </p>
                          ) : null}
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p
                            className={cn(
                              "mt-1 text-[10px]",
                              isMine
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground",
                            )}
                          >
                            {formatMessageTime(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {canSend ? (
                <form
                  className="flex items-end gap-2 border-t bg-muted/20 px-4 py-3"
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
                      className="w-full min-h-[52px] resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Écrire un message…"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (newMessage.trim() && !sendMutation.isPending) {
                            sendMutation.mutate();
                          }
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    className="shrink-0"
                    disabled={!newMessage.trim() || sendMutation.isPending}
                    aria-label="Envoyer"
                  >
                    <Send className="size-4" />
                  </Button>
                </form>
              ) : null}
            </>
          ) : (
            <EmptyState canSend={canSend} onCompose={startCompose} />
          )}
        </section>
      </div>
    </PageShell>
  );
}

function EmptyState({
  canSend,
  onCompose,
}: {
  canSend: boolean;
  onCompose: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <MessageSquare className="size-7 text-muted-foreground" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="font-medium">Sélectionnez une conversation</p>
        <p className="text-sm text-muted-foreground">
          Choisissez un contact dans la liste à gauche, ou démarrez un nouvel
          échange.
        </p>
      </div>
      {canSend ? (
        <Button type="button" className="gap-2" onClick={onCompose}>
          <PenSquare className="size-4" />
          Nouveau message
        </Button>
      ) : null}
    </div>
  );
}

function ComposePanel({
  contactSearch,
  onContactSearchChange,
  contacts,
  composeTo,
  onSelectContact,
  composeBody,
  onComposeBodyChange,
  onBack,
  onSubmit,
  isPending,
}: {
  contactSearch: string;
  onContactSearchChange: (v: string) => void;
  contacts: MessagingContactDto[];
  composeTo: MessagingContactDto | null;
  onSelectContact: (c: MessagingContactDto | null) => void;
  composeBody: string;
  onComposeBodyChange: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <>
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onBack}
          aria-label="Retour"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <p className="font-semibold">Nouveau message</p>
          <p className="text-xs text-muted-foreground">
            Recherchez un contact puis rédigez votre message
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-search">Destinataire</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="contact-search"
                placeholder="Nom ou prénom (2 caractères min.)"
                value={contactSearch}
                onChange={(e) => {
                  onContactSearchChange(e.target.value);
                  if (composeTo) onSelectContact(null);
                }}
                className="bg-background pl-8"
              />
            </div>
          </div>

          {composeTo ? (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <ContactAvatar contact={composeTo} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{displayName(composeTo)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {composeTo.organization.name}
                  {composeTo.role.pole
                    ? ` · ${composeTo.role.pole.name}`
                    : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelectContact(null)}
              >
                Changer
              </Button>
            </div>
          ) : contactSearch.trim().length >= 2 ? (
            <div className="overflow-hidden rounded-lg border">
              {contacts.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  Aucun contact trouvé ou non autorisé.
                </p>
              ) : (
                <ul className="divide-y">
                  {contacts.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                        onClick={() => onSelectContact(c)}
                      >
                        <ContactAvatar contact={c} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {displayName(c)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.organization.name}
                            {c.role.pole ? ` · ${c.role.pole.name}` : ""}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : contactSearch.trim().length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Saisissez au moins 2 caractères pour rechercher.
            </p>
          ) : null}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="compose-body">Message</Label>
            <textarea
              id="compose-body"
              className="w-full min-h-[120px] resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              value={composeBody}
              onChange={(e) => onComposeBodyChange(e.target.value)}
              placeholder="Rédigez votre premier message…"
              disabled={!composeTo}
            />
          </div>

          <Button
            type="button"
            className="w-full gap-2"
            disabled={!composeTo || !composeBody.trim() || isPending}
            onClick={onSubmit}
          >
            <Send className="size-4" />
            Démarrer la conversation
          </Button>
        </div>
      </div>
    </>
  );
}
