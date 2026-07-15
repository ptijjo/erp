"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Eye,
  FileText,
  ImageIcon,
  Loader2,
  X,
} from "lucide-react";

import {
  attachmentLabel,
  canPreviewAttachment,
  formatAttachmentSize,
  isImageAttachment,
  isPdfAttachment,
} from "../_lib/message-attachments";
import {
  downloadAttachmentFile,
  getAttachmentBlobUrl,
  getAttachmentPreviewDataUrl,
} from "../_lib/attachment-preview-cache";
import { Button } from "~/components/ui/button";
import type { MessageAttachmentDto } from "~/lib/api-types";
import { cn } from "~/lib/utils";

type MessageAttachmentListProps = {
  attachments: MessageAttachmentDto[];
  isMine: boolean;
};

export function MessageAttachmentList({
  attachments,
  isMine,
}: MessageAttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment) => (
        <MessageAttachmentItem
          key={attachment.id}
          attachment={attachment}
          isMine={isMine}
        />
      ))}
    </div>
  );
}

type ViewerState = {
  url: string;
  kind: "image" | "pdf";
  title: string;
};

function AttachmentViewer({
  viewer,
  onClose,
}: {
  viewer: ViewerState;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={viewer.title}
      onClick={onClose}
    >
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute top-4 right-4 z-10 size-10 rounded-full"
        onClick={onClose}
        aria-label="Fermer"
      >
        <X className="size-5" />
      </Button>
      <div
        className="flex max-h-[90vh] max-w-[min(960px,100%)] flex-col items-center gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="max-w-full truncate text-sm text-white/90">{viewer.title}</p>
        {viewer.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={viewer.url}
            alt={viewer.title}
            className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-lg"
          />
        ) : (
          <iframe
            src={`${viewer.url}#toolbar=1&navpanes=0`}
            title={viewer.title}
            className="h-[80vh] w-[min(900px,92vw)] rounded-lg bg-white shadow-lg"
          />
        )}
      </div>
    </div>
  );
}

function MessageAttachmentItem({
  attachment,
  isMine,
}: {
  attachment: MessageAttachmentDto;
  isMine: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(
    isImageAttachment(attachment.mimeType),
  );
  const [downloading, setDownloading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  useEffect(() => {
    if (!isImageAttachment(attachment.mimeType)) {
      setLoadingPreview(false);
      return;
    }

    let cancelled = false;
    setPreviewFailed(false);
    setLoadingPreview(true);
    setPreviewUrl(null);

    void (async () => {
      try {
        const dataUrl = await getAttachmentPreviewDataUrl(
          attachment.id,
          attachment.mimeType,
        );
        if (cancelled) return;
        setPreviewUrl(dataUrl);
      } catch {
        if (!cancelled) {
          setPreviewFailed(true);
          setPreviewUrl(null);
        }
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attachment.id, attachment.mimeType]);

  useEffect(() => {
    return () => {
      if (viewer?.url.startsWith("blob:")) {
        URL.revokeObjectURL(viewer.url);
      }
    };
  }, [viewer]);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadAttachmentFile(
        attachment.id,
        attachment.fileName,
        attachment.mimeType,
      );
    } finally {
      setDownloading(false);
    }
  };

  const closeViewer = () => {
    setViewer((current) => {
      if (current?.url.startsWith("blob:")) {
        URL.revokeObjectURL(current.url);
      }
      return null;
    });
  };

  const openViewer = async () => {
    if (!canPreviewAttachment(attachment.mimeType)) return;

    setOpening(true);
    try {
      if (isImageAttachment(attachment.mimeType) && previewUrl) {
        setViewer({
          url: previewUrl,
          kind: "image",
          title: attachmentLabel(attachment),
        });
        return;
      }

      const blobUrl = await getAttachmentBlobUrl(
        attachment.id,
        attachment.mimeType,
      );
      setViewer({
        url: blobUrl,
        kind: isPdfAttachment(attachment.mimeType) ? "pdf" : "image",
        title: attachmentLabel(attachment),
      });
    } catch {
      alert("Impossible d’ouvrir ce fichier.");
    } finally {
      setOpening(false);
    }
  };

  const showImagePreview =
    isImageAttachment(attachment.mimeType) &&
    !loadingPreview &&
    previewUrl != null &&
    !previewFailed;

  const previewable = canPreviewAttachment(attachment.mimeType);

  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-lg border text-left",
          isMine
            ? "border-primary-foreground/20 bg-primary-foreground/10"
            : "border-border bg-background/80",
        )}
      >
        {isImageAttachment(attachment.mimeType) ? (
          loadingPreview ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="size-5 animate-spin opacity-70" />
            </div>
          ) : showImagePreview ? (
            <button
              type="button"
              className="block w-full cursor-zoom-in"
              onClick={() => void openViewer()}
              disabled={opening}
              aria-label={`Voir ${attachmentLabel(attachment)}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={attachmentLabel(attachment)}
                className="max-h-48 w-full object-contain bg-black/5"
                onError={() => setPreviewFailed(true)}
              />
            </button>
          ) : (
            <div className="flex h-24 items-center justify-center gap-2 px-3 text-xs opacity-80">
              <ImageIcon className="size-4 shrink-0" />
              <span>Aperçu indisponible</span>
            </div>
          )
        ) : null}

        {!showImagePreview ? (
          <div className="flex items-center gap-1 px-2.5 py-2">
            {previewable ? (
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => void openViewer()}
                disabled={opening}
                aria-label={`Ouvrir ${attachmentLabel(attachment)}`}
              >
                <FileText className="size-4 shrink-0 opacity-70" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium underline-offset-2 hover:underline">
                    {attachmentLabel(attachment)}
                  </p>
                  <p className="text-[10px] opacity-70">
                    {formatAttachmentSize(attachment.sizeBytes)}
                    {isPdfAttachment(attachment.mimeType)
                      ? " · Cliquer pour ouvrir"
                      : ""}
                  </p>
                </div>
              </button>
            ) : (
              <>
                <FileText className="size-4 shrink-0 opacity-70" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {attachmentLabel(attachment)}
                  </p>
                  <p className="text-[10px] opacity-70">
                    {formatAttachmentSize(attachment.sizeBytes)} · Téléchargement
                    uniquement
                  </p>
                </div>
              </>
            )}
            {previewable ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                disabled={opening}
                onClick={() => void openViewer()}
                aria-label="Ouvrir"
              >
                {opening ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              disabled={downloading}
              onClick={() => void download()}
              aria-label="Télécharger"
            >
              {downloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 border-t border-primary-foreground/10 px-2.5 py-1.5">
            <p className="truncate text-[10px] opacity-80">
              {attachmentLabel(attachment)} ·{" "}
              {formatAttachmentSize(attachment.sizeBytes)}
            </p>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={opening}
                onClick={() => void openViewer()}
                aria-label="Ouvrir en grand"
              >
                {opening ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={downloading}
                onClick={() => void download()}
                aria-label="Télécharger"
              >
                {downloading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {viewer ? (
        <AttachmentViewer viewer={viewer} onClose={closeViewer} />
      ) : null}
    </>
  );
}

type PendingAttachmentChipProps = {
  attachment: MessageAttachmentDto;
  onRemove: () => void;
};

export function PendingAttachmentChip({
  attachment,
  onRemove,
}: PendingAttachmentChipProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs">
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{attachment.fileName}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatAttachmentSize(attachment.sizeBytes)}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 shrink-0"
        onClick={onRemove}
        aria-label="Retirer la pièce jointe"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
