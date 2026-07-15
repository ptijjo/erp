import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { R2ObjectStorageService } from '../storage/r2-object-storage.service';
import { ImageProcessorService } from '../storage/image-processor.service';
import {
  MESSAGE_ATTACHMENT_ALLOWED_MIME_TYPES,
  MESSAGE_ATTACHMENT_MAX_COUNT,
  MESSAGE_ATTACHMENT_ORPHAN_MAX_AGE_HOURS,
  extensionFromFileName,
  isMessageAttachmentImageMime,
  jpegDisplayNameForImage,
  maxBytesForMessageAttachmentMime,
  sanitizeAttachmentFileName,
} from './messaging-attachment.constants';

export type MessageAttachmentDto = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

@Injectable()
export class MessagingAttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: R2ObjectStorageService,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  assertUploadableFile(file: Express.Multer.File | undefined): void {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('Aucun fichier fourni.');
    }

    const mime = (file.mimetype ?? '').toLowerCase();
    if (mime.startsWith('video/')) {
      throw new BadRequestException(
        'Les fichiers vidéo ne sont pas autorisés pour le moment.',
      );
    }
    if (!MESSAGE_ATTACHMENT_ALLOWED_MIME_TYPES.has(mime)) {
      throw new BadRequestException(
        'Format non supporté. Formats acceptés : images (JPEG, PNG, WebP, GIF), PDF, Word et Excel.',
      );
    }

    const maxBytes = maxBytesForMessageAttachmentMime(mime);
    if (file.size > maxBytes) {
      const maxMo = Math.round(maxBytes / (1024 * 1024));
      throw new BadRequestException(
        `Fichier trop volumineux (${maxMo} Mo maximum pour ce type).`,
      );
    }
  }

  async uploadToThread(
    threadId: string,
    file: Express.Multer.File,
    viewer: AuthenticatedUser,
  ): Promise<MessageAttachmentDto> {
    await this.assertParticipant(threadId, viewer.sub);
    this.assertUploadableFile(file);

    void this.purgeOrphanAttachments().catch(() => undefined);

    if (!this.objectStorage.isConfigured()) {
      throw new BadRequestException(
        'Le stockage de pièces jointes n’est pas configuré.',
      );
    }

    const fileName = sanitizeAttachmentFileName(file.originalname);
    const mimeType = (file.mimetype ?? '').toLowerCase();
    const isImage = isMessageAttachmentImageMime(mimeType);

    let uploadBuffer: Buffer = file.buffer;
    let uploadMimeType = mimeType;
    let storedFileName = fileName;
    let sizeBytes = file.buffer.byteLength;
    let storageExtension = extensionFromFileName(fileName) || '.bin';

    if (isImage) {
      const processed =
        await this.imageProcessor.processMessageAttachmentImage(file);
      uploadBuffer = processed.buffer;
      uploadMimeType = processed.contentType;
      storedFileName = jpegDisplayNameForImage(fileName);
      sizeBytes = processed.byteLength;
      storageExtension = '.jpg';
    }

    const pendingCount = await this.prisma.messageAttachment.count({
      where: {
        threadId,
        uploaderId: viewer.sub,
        messageId: null,
      },
    });
    if (pendingCount >= MESSAGE_ATTACHMENT_MAX_COUNT) {
      throw new BadRequestException(
        `Maximum ${MESSAGE_ATTACHMENT_MAX_COUNT} pièces jointes en attente d’envoi.`,
      );
    }

    const attachment = await this.prisma.messageAttachment.create({
      data: {
        threadId,
        uploaderId: viewer.sub,
        storageKey: 'pending',
        fileName: storedFileName,
        mimeType: uploadMimeType,
        sizeBytes,
      },
    });

    const storageKey = this.objectStorage.buildMessageAttachmentKey(
      threadId,
      attachment.id,
      storageExtension,
    );

    try {
      await this.objectStorage.uploadPrivateFile(
        storageKey,
        uploadBuffer,
        uploadMimeType,
      );
    } catch (err) {
      await this.prisma.messageAttachment.delete({ where: { id: attachment.id } });
      throw err;
    }

    const updated = await this.prisma.messageAttachment.update({
      where: { id: attachment.id },
      data: { storageKey },
    });

    return this.mapAttachment(updated);
  }

  async deleteAllAttachmentsForThread(threadId: string): Promise<number> {
    const attachments = await this.prisma.messageAttachment.findMany({
      where: { threadId },
      select: { id: true, storageKey: true },
    });
    if (attachments.length === 0) {
      return 0;
    }

    await this.objectStorage.deleteByKeys(
      attachments.map((attachment) => attachment.storageKey),
    );
    return attachments.length;
  }

  async purgeOrphanAttachments(
    olderThanHours = MESSAGE_ATTACHMENT_ORPHAN_MAX_AGE_HOURS,
  ): Promise<{ deleted: number }> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const orphans = await this.prisma.messageAttachment.findMany({
      where: {
        messageId: null,
        createdAt: { lt: cutoff },
      },
      select: { id: true, storageKey: true },
    });

    if (orphans.length === 0) {
      return { deleted: 0 };
    }

    await this.objectStorage.deleteByKeys(
      orphans.map((attachment) => attachment.storageKey),
    );
    await this.prisma.messageAttachment.deleteMany({
      where: { id: { in: orphans.map((attachment) => attachment.id) } },
    });

    return { deleted: orphans.length };
  }

  async deleteAllThreadsForUser(userId: string): Promise<number> {
    const participations = await this.prisma.messageThreadParticipant.findMany({
      where: { userId },
      select: { threadId: true },
    });

    let deletedThreads = 0;
    for (const { threadId } of participations) {
      await this.deleteAllAttachmentsForThread(threadId);
      await this.prisma.messageThread.delete({ where: { id: threadId } });
      deletedThreads += 1;
    }

    return deletedThreads;
  }

  async linkAttachmentsToMessage(
    threadId: string,
    messageId: string,
    attachmentIds: string[],
    viewer: AuthenticatedUser,
  ): Promise<void> {
    if (attachmentIds.length === 0) return;
    if (attachmentIds.length > MESSAGE_ATTACHMENT_MAX_COUNT) {
      throw new BadRequestException(
        `Maximum ${MESSAGE_ATTACHMENT_MAX_COUNT} pièces jointes par message.`,
      );
    }

    const uniqueIds = [...new Set(attachmentIds)];
    if (uniqueIds.length !== attachmentIds.length) {
      throw new BadRequestException('Pièces jointes en double.');
    }

    const rows = await this.prisma.messageAttachment.findMany({
      where: { id: { in: uniqueIds } },
    });

    if (rows.length !== uniqueIds.length) {
      throw new BadRequestException('Une ou plusieurs pièces jointes sont introuvables.');
    }

    for (const row of rows) {
      if (row.threadId !== threadId) {
        throw new BadRequestException(
          'Pièce jointe associée à une autre conversation.',
        );
      }
      if (row.uploaderId !== viewer.sub) {
        throw new ForbiddenException(
          'Vous ne pouvez joindre que vos propres fichiers.',
        );
      }
      if (row.messageId != null) {
        throw new BadRequestException(
          'Une ou plusieurs pièces jointes ont déjà été envoyées.',
        );
      }
    }

    await this.prisma.messageAttachment.updateMany({
      where: { id: { in: uniqueIds } },
      data: { messageId },
    });
  }

  async downloadAttachment(
    attachmentId: string,
    viewer: AuthenticatedUser,
  ): Promise<{ fileName: string; mimeType: string; body: Buffer }> {
    const attachment = await this.prisma.messageAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) {
      throw new NotFoundException('Pièce jointe introuvable.');
    }

    await this.assertParticipant(attachment.threadId, viewer.sub);

    const object = await this.objectStorage.getObjectBody(attachment.storageKey);
    return {
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      body: object.body,
    };
  }

  mapAttachment(row: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: Date;
  }): MessageAttachmentDto {
    return {
      id: row.id,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      createdAt: row.createdAt,
    };
  }

  private async assertParticipant(threadId: string, userId: string): Promise<void> {
    const part = await this.prisma.messageThreadParticipant.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });
    if (!part) {
      throw new ForbiddenException('Accès à cette conversation refusé.');
    }
  }
}
