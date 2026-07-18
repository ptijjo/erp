import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { MessageThreadScope, type Prisma } from '../generated/prisma/client';
import { RealtimeHubService } from '../realtime/realtime-hub.service';
import { MessagingPolicyService } from './messaging-policy.service';
import type { CreateThreadDto, SendMessageDto } from './dto/messaging.dto';
import { DirectoryService } from '../directory/directory.service';
import type { MessagingContactDto } from './messaging.types';
import { MessagingAttachmentService } from './messaging-attachment.service';

const messagingUserPublicSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profilePhotoUrl: true,
} as const;

const messageInclude = {
  sender: {
    select: messagingUserPublicSelect,
  },
  attachments: {
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

const threadInclude = {
  participants: {
    include: {
      user: {
        select: {
          ...messagingUserPublicSelect,
          organization: { select: { id: true, name: true, organizationType: true } },
        },
      },
    },
  },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: messageInclude,
  },
} as const;

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: MessagingPolicyService,
    private readonly realtimeHub: RealtimeHubService,
    private readonly directoryService: DirectoryService,
    private readonly attachmentService: MessagingAttachmentService,
  ) {}

  async searchContacts(
    viewer: AuthenticatedUser,
    query: string,
    limit = 20,
  ): Promise<MessagingContactDto[]> {
    const entries = await this.directoryService.search(viewer, query, limit);
    const eligible: MessagingContactDto[] = [];

    for (const entry of entries) {
      if (!entry.userId || entry.userId === viewer.sub) {
        continue;
      }
      try {
        const peer = await this.policy.loadPeer(entry.userId);
        this.policy.assertCanExchange(viewer, peer);
        eligible.push({
          id: entry.userId,
          email: entry.email ?? peer.email,
          firstName: entry.firstName,
          lastName: entry.lastName,
          profilePhotoUrl: entry.profilePhotoUrl,
          organizationId: entry.organization.id,
          organization: {
            name: entry.organization.name,
            organizationType: peer.organizationType,
          },
          role: entry.role ?? {
            name: peer.roleName,
            pole: peer.poleCode
              ? { code: peer.poleCode, name: peer.poleCode }
              : null,
          },
          employeeId: entry.employeeId,
          position: entry.position,
          department: entry.department,
        });
      } catch {
        /* non éligible */
      }
    }
    return eligible;
  }

  async listThreads(viewer: AuthenticatedUser) {
    const participations = await this.prisma.messageThreadParticipant.findMany({
      where: { userId: viewer.sub },
      include: {
        thread: { include: threadInclude },
      },
      orderBy: { thread: { updatedAt: 'desc' } },
    });

    return participations.map((p) =>
      this.mapThreadForViewer(p.thread, viewer.sub),
    );
  }

  async getThread(threadId: string, viewer: AuthenticatedUser) {
    await this.assertParticipant(threadId, viewer.sub);
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      include: threadInclude,
    });
    if (!thread) {
      throw new NotFoundException('Conversation introuvable.');
    }
    return this.mapThreadForViewer(thread, viewer.sub);
  }

  async listMessages(
    threadId: string,
    viewer: AuthenticatedUser,
    limit = 50,
  ) {
    await this.assertParticipant(threadId, viewer.sub);
    return this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      take: Math.min(limit, 200),
      include: messageInclude,
    });
  }

  async openDirectThread(recipientUserId: string, viewer: AuthenticatedUser) {
    const peer = await this.policy.loadPeer(recipientUserId);
    const scope = this.policy.assertCanExchange(viewer, peer);

    const existing = await this.findDirectThread(viewer.sub, peer.id);
    if (existing) {
      return { threadId: existing.id, created: false };
    }

    const poleCode =
      scope === MessageThreadScope.MAIN_INTRA_POLE
        ? viewer.role.poleCode
        : null;

    const created = await this.prisma.messageThread.create({
      data: {
        scope,
        poleCode,
        participants: {
          create: [{ userId: viewer.sub }, { userId: peer.id }],
        },
      },
    });

    return { threadId: created.id, created: true };
  }

  async createThread(dto: CreateThreadDto, viewer: AuthenticatedUser) {
    this.assertMessageContent(dto.body, dto.attachmentIds);

    const peer = await this.policy.loadPeer(dto.recipientUserId);
    const scope = this.policy.assertCanExchange(viewer, peer);

    const existing = await this.findDirectThread(viewer.sub, peer.id);
    if (existing) {
      await this.sendMessage(
        existing.id,
        { body: dto.body, attachmentIds: dto.attachmentIds },
        viewer,
      );
      const thread = await this.getThread(existing.id, viewer);
      return { thread, created: false };
    }

    const poleCode =
      scope === MessageThreadScope.MAIN_INTRA_POLE
        ? viewer.role.poleCode
        : null;

    const createdThread = await this.prisma.messageThread.create({
      data: {
        scope,
        poleCode,
        participants: {
          create: [{ userId: viewer.sub }, { userId: peer.id }],
        },
      },
    });

    await this.sendMessage(
      createdThread.id,
      { body: dto.body, attachmentIds: dto.attachmentIds },
      viewer,
    );

    const thread = await this.getThread(createdThread.id, viewer);
    return {
      thread,
      created: true,
    };
  }

  async sendMessage(
    threadId: string,
    dto: SendMessageDto,
    viewer: AuthenticatedUser,
  ) {
    this.assertMessageContent(dto.body, dto.attachmentIds);
    await this.assertParticipant(threadId, viewer.sub);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.message.create({
        data: {
          threadId,
          senderId: viewer.sub,
          body: dto.body.trim(),
        },
      });
      await tx.messageThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });
      return row;
    });

    if (dto.attachmentIds?.length) {
      await this.attachmentService.linkAttachmentsToMessage(
        threadId,
        created.id,
        dto.attachmentIds,
        viewer,
      );
    }

    const message = await this.prisma.message.findUniqueOrThrow({
      where: { id: created.id },
      include: messageInclude,
    });

    const participants = await this.prisma.messageThreadParticipant.findMany({
      where: { threadId },
      select: { userId: true },
    });
    const payload = {
      threadId,
      messageId: message.id,
      preview: this.buildMessagePreview(dto.body, dto.attachmentIds),
    };
    this.realtimeHub.emitToMany(
      participants.map((p) => p.userId).filter((id) => id !== viewer.sub),
      'message',
      payload,
    );

    return message;
  }

  async deleteThread(threadId: string, viewer: AuthenticatedUser) {
    await this.assertParticipant(threadId, viewer.sub);
    await this.attachmentService.deleteAllAttachmentsForThread(threadId);
    await this.prisma.messageThread.delete({ where: { id: threadId } });
    return { ok: true };
  }

  async markThreadRead(threadId: string, viewer: AuthenticatedUser) {
    const part = await this.prisma.messageThreadParticipant.findUnique({
      where: { threadId_userId: { threadId, userId: viewer.sub } },
    });
    if (!part) {
      throw new NotFoundException('Conversation introuvable.');
    }
    await this.prisma.messageThreadParticipant.update({
      where: { id: part.id },
      data: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  private async findDirectThread(userA: string, userB: string) {
    const threads = await this.prisma.messageThread.findMany({
      where: {
        AND: [
          { participants: { some: { userId: userA } } },
          { participants: { some: { userId: userB } } },
        ],
      },
      include: {
        participants: { select: { userId: true } },
      },
    });
    return (
      threads.find(
        (t) =>
          t.participants.length === 2 &&
          t.participants.every((p) => p.userId === userA || p.userId === userB),
      ) ?? null
    );
  }

  private async assertParticipant(threadId: string, userId: string) {
    const part = await this.prisma.messageThreadParticipant.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });
    if (!part) {
      throw new ForbiddenException('Accès à cette conversation refusé.');
    }
  }

  private assertMessageContent(body: string, attachmentIds?: string[]): void {
    const hasText = body.trim().length > 0;
    const hasAttachments = (attachmentIds?.length ?? 0) > 0;
    if (!hasText && !hasAttachments) {
      throw new BadRequestException(
        'Le message doit contenir du texte ou au moins une pièce jointe.',
      );
    }
  }

  private buildMessagePreview(body: string, attachmentIds?: string[]): string {
    const trimmed = body.trim();
    if (trimmed.length > 0) {
      return trimmed.slice(0, 120);
    }
    const count = attachmentIds?.length ?? 0;
    if (count === 1) {
      return 'Pièce jointe';
    }
    return `${count} pièces jointes`;
  }

  private mapThreadForViewer(
    thread: Prisma.MessageThreadGetPayload<{ include: typeof threadInclude }>,
    viewerId: string,
  ) {
    const others = thread.participants
      .filter((p) => p.userId !== viewerId)
      .map((p) => p.user);
    const last = thread.messages[0] ?? null;
    const myPart = thread.participants.find((p) => p.userId === viewerId);
    const unread =
      last &&
      last.senderId !== viewerId &&
      (!myPart?.lastReadAt || last.createdAt > myPart.lastReadAt);

    return {
      id: thread.id,
      scope: thread.scope,
      poleCode: thread.poleCode,
      updatedAt: thread.updatedAt,
      participants: others,
      lastMessage: last,
      unread: Boolean(unread),
    };
  }
}
