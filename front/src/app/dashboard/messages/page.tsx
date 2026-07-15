"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  Paperclip,
  PenSquare,
  Search,
  Send,
  Trash2,
  Users,
} from "lucide-react";

import { ContactAvatar } from "./_components/ContactAvatar";
import {
  MessageAttachmentList,
  PendingAttachmentChip,
} from "./_components/MessageAttachments";
import {
  displayName,
  formatMessageTime,
  formatScopeLabel,
  threadTitle,
} from "./_lib/messaging-display";
import {
  MESSAGE_ATTACHMENT_MAX_COUNT,
  formatMessagePreview,
  validateMessageAttachmentFile,
} from "./_lib/message-attachments";
import { clearAttachmentPreviewCache } from "./_lib/attachment-preview-cache";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type {
  MessageAttachmentDto,
  MessageDto,
  MessageThreadSummaryDto,
  MessagingContactDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { cn } from "~/lib/utils";

type MainView = "empty" | "thread" | "compose";

function contactSubtitle(c: MessagingContactDto): string {
  const parts = [
    c.organization.name,
    c.role.name,
    c.position,
    c.department?.name,
  ].filter(Boolean);
  return parts.join(" · ");
}

export default function MessagesPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const threadFromUrl = searchParams.get("thread");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const composeFileInputRef = useRef<HTMLInputElement>(null);

  const canRead = me != null && hasMePermission(me, "read", "Message");
  const canSend = me != null && hasMePermission(me, "create", "Message");
  const canDelete = me != null && hasMePermission(me, "delete", "Message");

  const [localThreadId, setLocalThreadId] = useState<string | null>(null);
  const [mainView, setMainView] = useState<MainView>("empty");
  const [threadSearch, setThreadSearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [pendingAttachmentIds, setPendingAttachmentIds] = useState<string[]>(
    [],
  );
  const [pendingAttachments, setPendingAttachments] = useState<
    MessageAttachmentDto[]
  >([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [composeBody, setComposeBody] = useState("");
  const [composeLocalFiles, setComposeLocalFiles] = useState<File[]>([]);
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
      const attachmentPreview = t.lastMessage
        ? formatMessagePreview(t.lastMessage).toLowerCase()
        : "";
      return names.includes(q) || preview.includes(q) || attachmentPreview.includes(q);
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

  const uploadAttachmentToThread = async (threadId: string, file: File) => {
    const validationError = validateMessageAttachmentFile(file);
    if (validationError) {
      throw new Error(validationError);
    }
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post<MessageAttachmentDto>(
      `/messaging/threads/${threadId}/attachments`,
      formData,
    );
    return data;
  };

  const handleReplyFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedThreadId) return;

    if (pendingAttachmentIds.length >= MESSAGE_ATTACHMENT_MAX_COUNT) {
      alert(`Maximum ${MESSAGE_ATTACHMENT_MAX_COUNT} pièces jointes par message.`);
      return;
    }

    setUploadingAttachment(true);
    try {
      const uploaded = await uploadAttachmentToThread(selectedThreadId, file);
      setPendingAttachmentIds((current) => [...current, uploaded.id]);
      setPendingAttachments((current) => [...current, uploaded]);
    } catch (e) {
      alert(apiErrorMessage(e, "Envoi du fichier impossible"));
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removePendingAttachment = (attachmentId: string) => {
    setPendingAttachmentIds((current) =>
      current.filter((id) => id !== attachmentId),
    );
    setPendingAttachments((current) =>
      current.filter((item) => item.id !== attachmentId),
    );
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedThreadId) return;
      const { data } = await api.post<MessageDto>(
        `/messaging/threads/${selectedThreadId}/messages`,
        {
          body: newMessage,
          attachmentIds:
            pendingAttachmentIds.length > 0 ? pendingAttachmentIds : undefined,
        },
      );
      return data;
    },
    onSuccess: () => {
      setNewMessage("");
      setPendingAttachmentIds([]);
      setPendingAttachments([]);
      void queryClient.invalidateQueries({ queryKey: ["messaging"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Envoi impossible"));
    },
  });

  const composeMutation = useMutation({
    mutationFn: async () => {
      if (!composeTo) throw new Error("Destinataire requis");

      const { data: opened } = await api.post<{ threadId: string }>(
        "/messaging/threads/open",
        { recipientUserId: composeTo.id },
      );

      const attachmentIds: string[] = [];
      for (const file of composeLocalFiles) {
        const uploaded = await uploadAttachmentToThread(opened.threadId, file);
        attachmentIds.push(uploaded.id);
      }

      await api.post<MessageDto>(
        `/messaging/threads/${opened.threadId}/messages`,
        {
          body: composeBody,
          attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
        },
      );

      const { data: thread } = await api.get<MessageThreadSummaryDto>(
        `/messaging/threads/${opened.threadId}`,
      );
      return thread;
    },
    onSuccess: (thread) => {
      setComposeBody("");
      setComposeLocalFiles([]);
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

  const backToList = () => {
    setLocalThreadId(null);
    setMainView("empty");
  };

  const deleteThreadMutation = useMutation({
    mutationFn: async (threadId: string) => {
      await api.delete(`/messaging/threads/${threadId}`);
    },
    onSuccess: (_data, deletedThreadId) => {
      clearAttachmentPreviewCache();
      if (
        selectedThreadId === deletedThreadId ||
        threadFromUrl === deletedThreadId
      ) {
        backToList();
        if (threadFromUrl === deletedThreadId) {
          router.replace(pathname);
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["messaging"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Suppression impossible"));
    },
  });

  const canSubmitReply =
    (newMessage.trim().length > 0 || pendingAttachmentIds.length > 0) &&
    !sendMutation.isPending &&
    !uploadingAttachment;

  const confirmDeleteThread = (threadId: string, peerName: string) => {
    const confirmed = window.confirm(
      `Supprimer définitivement la conversation avec ${peerName} ? Les messages et pièces jointes seront effacés pour les deux participants.`,
    );
    if (!confirmed) return;
    deleteThreadMutation.mutate(threadId);
  };

  const handleDeleteThread = () => {
    if (!selectedThreadId) return;
    const peerName = selectedThread
      ? threadTitle(selectedThread.participants)
      : "cette conversation";
    confirmDeleteThread(selectedThreadId, peerName);
  };

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
                  <li
                    key={t.id}
                    className="group flex items-stretch border-b"
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
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
                            {t.lastMessage
                              ? formatMessagePreview(t.lastMessage)
                              : ""}
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
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="my-auto mr-2 size-8 shrink-0 text-muted-foreground hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                        aria-label={`Supprimer la conversation avec ${threadTitle(t.participants)}`}
                        disabled={deleteThreadMutation.isPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          confirmDeleteThread(
                            t.id,
                            threadTitle(t.participants),
                          );
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
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
              composeLocalFiles={composeLocalFiles}
              onComposeLocalFilesChange={setComposeLocalFiles}
              composeFileInputRef={composeFileInputRef}
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
                {canDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                    aria-label="Supprimer la conversation"
                    disabled={deleteThreadMutation.isPending}
                    onClick={handleDeleteThread}
                  >
                    <Trash2 className="size-4" />
                    <span className="hidden sm:inline">Supprimer</span>
                  </Button>
                ) : null}
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
                          {m.body.trim() ? (
                            <p className="whitespace-pre-wrap">{m.body}</p>
                          ) : null}
                          {m.attachments && m.attachments.length > 0 ? (
                            <MessageAttachmentList
                              attachments={m.attachments}
                              isMine={isMine}
                            />
                          ) : null}
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
                    if (canSubmitReply) {
                      sendMutation.mutate();
                    }
                  }}
                >
                  <input
                    ref={replyFileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => void handleReplyFileSelect(e)}
                  />
                  <div className="flex-1 space-y-2">
                    {pendingAttachments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {pendingAttachments.map((attachment) => (
                          <PendingAttachmentChip
                            key={attachment.id}
                            attachment={attachment}
                            onRemove={() => removePendingAttachment(attachment.id)}
                          />
                        ))}
                      </div>
                    ) : null}
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
                          if (canSubmitReply) {
                            sendMutation.mutate();
                          }
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    disabled={
                      uploadingAttachment ||
                      pendingAttachmentIds.length >= MESSAGE_ATTACHMENT_MAX_COUNT
                    }
                    onClick={() => replyFileInputRef.current?.click()}
                    aria-label="Joindre un fichier"
                  >
                    <Paperclip className="size-4" />
                  </Button>
                  <Button
                    type="submit"
                    size="icon"
                    className="shrink-0"
                    disabled={!canSubmitReply}
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
  composeLocalFiles,
  onComposeLocalFilesChange,
  composeFileInputRef,
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
  composeLocalFiles: File[];
  onComposeLocalFilesChange: (files: File[]) => void;
  composeFileInputRef: React.RefObject<HTMLInputElement | null>;
  onBack: () => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const canSubmitCompose =
    composeTo != null &&
    (composeBody.trim().length > 0 || composeLocalFiles.length > 0) &&
    !isPending;

  const handleComposeFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateMessageAttachmentFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }
    if (composeLocalFiles.length >= MESSAGE_ATTACHMENT_MAX_COUNT) {
      alert(`Maximum ${MESSAGE_ATTACHMENT_MAX_COUNT} pièces jointes par message.`);
      return;
    }
    onComposeLocalFilesChange([...composeLocalFiles, file]);
  };

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
                  {contactSubtitle(composeTo)}
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
                            {contactSubtitle(c)}
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

          <div className="space-y-2">
            <Label>Pièces jointes</Label>
            <input
              ref={composeFileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleComposeFileSelect}
              disabled={!composeTo}
            />
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={
                !composeTo ||
                composeLocalFiles.length >= MESSAGE_ATTACHMENT_MAX_COUNT
              }
              onClick={() => composeFileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
              Ajouter un fichier
            </Button>
            <p className="text-xs text-muted-foreground">
              Images (10 Mo max), PDF / Word / Excel (15 Mo max). Pas de vidéo.
            </p>
            {composeLocalFiles.length > 0 ? (
              <ul className="space-y-2">
                {composeLocalFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onComposeLocalFilesChange(
                          composeLocalFiles.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Retirer
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <Button
            type="button"
            className="w-full gap-2"
            disabled={!canSubmitCompose}
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
