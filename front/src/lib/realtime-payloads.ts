/** Payload SSE `notification` (émis par l’API). */
export type RealtimeNotificationPayload = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
};

/** Payload SSE `message` (émis par l’API). */
export type RealtimeMessagePayload = {
  threadId: string;
  messageId?: string;
  preview: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseRealtimeNotification(
  raw: string,
): RealtimeNotificationPayload | null {
  try {
    const data: unknown = JSON.parse(raw);
    if (
      !isRecord(data) ||
      typeof data.id !== "string" ||
      typeof data.title !== "string" ||
      typeof data.body !== "string"
    ) {
      return null;
    }
    return {
      id: data.id,
      type: typeof data.type === "string" ? data.type : "UNKNOWN",
      title: data.title,
      body: data.body,
      createdAt:
        typeof data.createdAt === "string"
          ? data.createdAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function parseRealtimeMessage(raw: string): RealtimeMessagePayload | null {
  try {
    const data: unknown = JSON.parse(raw);
    if (
      !isRecord(data) ||
      typeof data.threadId !== "string" ||
      typeof data.preview !== "string"
    ) {
      return null;
    }
    return {
      threadId: data.threadId,
      messageId:
        typeof data.messageId === "string" ? data.messageId : undefined,
      preview: data.preview,
    };
  } catch {
    return null;
  }
}
