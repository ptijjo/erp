"use client";

import { useEffect, useState } from "react";
import { Download, FileText, ImageIcon, Loader2, X } from "lucide-react";

import {
  attachmentLabel,
  formatAttachmentSize,
  isImageAttachment,
} from "../_lib/message-attachments";
import {
  downloadAttachmentFile,
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

  const showImagePreview =
    isImageAttachment(attachment.mimeType) &&
    !loadingPreview &&
    previewUrl != null &&
    !previewFailed;

  return (
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
            className="block w-full"
            onClick={() => void download()}
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
        <div className="flex items-center gap-2 px-2.5 py-2">
          <FileText className="size-4 shrink-0 opacity-70" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">
              {attachmentLabel(attachment)}
            </p>
            <p className="text-[10px] opacity-70">
              {formatAttachmentSize(attachment.sizeBytes)}
            </p>
          </div>
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
      )}
    </div>
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
