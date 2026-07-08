import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { MessageThreadScope, type Prisma } from '../generated/prisma/client';
import { RealtimeHubService } from '../realtime/realtime-hub.service';
import { MessagingPolicyService } from './messaging-policy.service';
import type { CreateThreadDto, SendMessageDto } from './dto/messaging.dto';
import { DirectoryService } from '../directory/directory.service';
import type { MessagingContactDto } from './messaging.types';

const messagingUserPublicSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profilePhotoUrl: true,
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
    include: {
      sender: {
        select: messagingUserPublicSelect,
      },
    },
  },
} as const;

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: MessagingPolicyService,
    private readonly realtimeHub: RealtimeHubService,
    private readonly directoryService: DirectoryService,
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
      include: {
        sender: {
          select: messagingUserPublicSelect,
        },
      },
    });
  }

  async createThread(dto: CreateThreadDto, viewer: AuthenticatedUser) {
    const peer = await this.policy.loadPeer(dto.recipientUserId);
    const scope = this.policy.assertCanExchange(viewer, peer);

    const existing = await this.findDirectThread(viewer.sub, peer.id);
    if (existing) {
      await this.sendMessage(existing.id, { body: dto.body }, viewer);
      const thread = await this.getThread(existing.id, viewer);
      return { thread, created: false };
    }

    const poleCode =
      scope === MessageThreadScope.MAIN_INTRA_POLE
        ? viewer.role.poleCode
        : null;

    const thread = await this.prisma.$transaction(async (tx) => {
      const created = await tx.messageThread.create({
        data: {
          scope,
          poleCode,
          participants: {
            create: [{ userId: viewer.sub }, { userId: peer.id }],
          },
        },
      });
      await tx.message.create({
        data: {
          threadId: created.id,
          senderId: viewer.sub,
          body: dto.body.trim(),
        },
      });
      return tx.messageThread.findUniqueOrThrow({
        where: { id: created.id },
        include: threadInclude,
      });
    });

    const payload = {
      threadId: thread.id,
      preview: dto.body.trim().slice(0, 120),
    };
    this.realtimeHub.emit(peer.id, 'message', payload);
    this.realtimeHub.emit(viewer.sub, 'message', payload);

    return {
      thread: this.mapThreadForViewer(thread, viewer.sub),
      created: true,
    };
  }

  async sendMessage(
    threadId: string,
    dto: SendMessageDto,
    viewer: AuthenticatedUser,
  ) {
    await this.assertParticipant(threadId, viewer.sub);

    const message = await this.prisma.$transaction(async (tx) => {
      const row = await tx.message.create({
        data: {
          threadId,
          senderId: viewer.sub,
          body: dto.body.trim(),
        },
        include: {
          sender: {
            select: messagingUserPublicSelect,
          },
        },
      });
      await tx.messageThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });
      return row;
    });

    const participants = await this.prisma.messageThreadParticipant.findMany({
      where: { threadId },
      select: { userId: true },
    });
    const payload = {
      threadId,
      messageId: message.id,
      preview: message.body.slice(0, 120),
    };
    this.realtimeHub.emitToMany(
      participants.map((p) => p.userId),
      'message',
      payload,
    );

    return message;
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
