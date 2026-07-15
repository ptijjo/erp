import { api } from "~/lib/api";

const previewCache = new Map<string, string>();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Impossible de lire l’aperçu."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Lecture échouée."));
    reader.readAsDataURL(blob);
  });
}

async function fetchAttachmentBytes(
  attachmentId: string,
  inline: boolean,
): Promise<ArrayBuffer> {
  const response = await api.get<ArrayBuffer>(
    `/messaging/attachments/${attachmentId}/download`,
    {
      responseType: "arraybuffer",
      headers: { Accept: "*/*" },
      params: inline ? { inline: "true" } : undefined,
    },
  );

  const buffer = response.data;
  const contentType = (response.headers["content-type"] ?? "")
    .split(";")[0]
    ?.trim()
    .toLowerCase();

  if (contentType.includes("application/json") || buffer.byteLength === 0) {
    throw new Error("Réponse invalide pour l’aperçu.");
  }

  return buffer;
}

export async function getAttachmentPreviewDataUrl(
  attachmentId: string,
  mimeType: string,
): Promise<string> {
  const cached = previewCache.get(attachmentId);
  if (cached) return cached;

  const buffer = await fetchAttachmentBytes(attachmentId, true);
  const blob = new Blob([buffer], { type: mimeType });
  const dataUrl = await blobToDataUrl(blob);
  previewCache.set(attachmentId, dataUrl);
  return dataUrl;
}

export function clearAttachmentPreviewCache(): void {
  previewCache.clear();
}

export async function downloadAttachmentFile(
  attachmentId: string,
  fileName: string,
  mimeType: string,
): Promise<void> {
  const buffer = await fetchAttachmentBytes(attachmentId, false);
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
