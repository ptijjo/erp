/** Pièces jointes uploadées mais jamais envoyées — purge après ce délai. */
export const MESSAGE_ATTACHMENT_ORPHAN_MAX_AGE_HOURS = 24;

/** Nombre maximal de pièces jointes par message. */
export const MESSAGE_ATTACHMENT_MAX_COUNT = 5;

/** Limite Multer (doit couvrir la taille document max). */
export const MESSAGE_ATTACHMENT_MAX_INPUT_BYTES = 15 * 1024 * 1024;

/** Images dans la messagerie (JPEG, PNG, WebP, GIF). */
export const MESSAGE_ATTACHMENT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Documents (PDF, Word, Excel). */
export const MESSAGE_ATTACHMENT_MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export const MESSAGE_ATTACHMENT_ALLOWED_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
]);

export function isMessageAttachmentImageMime(mimeType: string): boolean {
  return IMAGE_MIME_TYPES.has(mimeType.toLowerCase());
}

export function maxBytesForMessageAttachmentMime(mimeType: string): number {
  return isMessageAttachmentImageMime(mimeType)
    ? MESSAGE_ATTACHMENT_MAX_IMAGE_BYTES
    : MESSAGE_ATTACHMENT_MAX_DOCUMENT_BYTES;
}

export function sanitizeAttachmentFileName(originalName: string): string {
  const base = originalName.replace(/[/\\]/g, '').trim() || 'fichier';
  return base.slice(0, 200);
}

export function extensionFromFileName(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0 || dot === fileName.length - 1) return '';
  return fileName.slice(dot).toLowerCase();
}

export function jpegDisplayNameForImage(originalName: string): string {
  const base = sanitizeAttachmentFileName(originalName);
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return `${stem}.jpg`;
}
