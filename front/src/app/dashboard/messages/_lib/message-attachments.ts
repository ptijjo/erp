import type { MessageAttachmentDto, MessageDto } from "~/lib/api-types";

export const MESSAGE_ATTACHMENT_MAX_COUNT = 5;
export const MESSAGE_ATTACHMENT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MESSAGE_ATTACHMENT_MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function isImageAttachment(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isPdfAttachment(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

/** Image ou PDF : peuvent s’ouvrir en visionneuse sans téléchargement. */
export function canPreviewAttachment(mimeType: string): boolean {
  return isImageAttachment(mimeType) || isPdfAttachment(mimeType);
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function validateMessageAttachmentFile(file: File): string | null {
  if (file.type.startsWith("video/")) {
    return "Les fichiers vidéo ne sont pas autorisés pour le moment.";
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "Format non supporté. Utilisez une image, un PDF, Word ou Excel.";
  }
  const maxBytes = isImageAttachment(file.type)
    ? MESSAGE_ATTACHMENT_MAX_IMAGE_BYTES
    : MESSAGE_ATTACHMENT_MAX_DOCUMENT_BYTES;
  if (file.size > maxBytes) {
    const maxMo = Math.round(maxBytes / (1024 * 1024));
    return `Fichier trop volumineux (${maxMo} Mo maximum pour ce type).`;
  }
  return null;
}

export function formatMessagePreview(message: Pick<MessageDto, "body" | "attachments">): string {
  const trimmed = message.body.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  const count = message.attachments?.length ?? 0;
  if (count === 1) {
    return "Pièce jointe";
  }
  if (count > 1) {
    return `${count} pièces jointes`;
  }
  return "";
}

export function attachmentLabel(attachment: MessageAttachmentDto): string {
  return attachment.fileName;
}
