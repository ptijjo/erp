import type { MessageSenderDto } from "~/lib/api-types";

export function displayName(c: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  const n = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  return n || c.email;
}

export function contactInitials(c: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  if (c.firstName && c.lastName) {
    return `${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase();
  }
  if (c.firstName) return c.firstName.slice(0, 2).toUpperCase();
  return c.email.slice(0, 2).toUpperCase();
}

export function threadTitle(participants: MessageSenderDto[]) {
  return participants.map((p) => displayName(p)).join(", ") || "Conversation";
}

export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function formatScopeLabel(scope: string) {
  return scope.replaceAll("_", " ").toLowerCase();
}
