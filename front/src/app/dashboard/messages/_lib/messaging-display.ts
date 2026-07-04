import type { MessageSenderDto } from "~/lib/api-types";
import {
  userDisplayName,
  userInitials,
} from "~/app/dashboard/utilisateurs/_lib/user-display";

export function displayName(c: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  return userDisplayName(c);
}

export function contactInitials(c: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  return userInitials(c);
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
