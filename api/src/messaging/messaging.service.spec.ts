jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MessageThreadScope } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeHubService } from '../realtime/realtime-hub.service';
import { MessagingPolicyService } from './messaging-policy.service';
import { MessagingAttachmentService } from './messaging-attachment.service';
import { MessagingService } from './messaging.service';

const viewer: AuthenticatedUser = {
  sub: 'user-1',
  email: 'a@test.com',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  role: { id: 'r1', name: 'ADMIN', poleCode: null },
};

describe('MessagingService attachments', () => {
  let service: MessagingService;
  let messageCreate: jest.Mock;
  let messageFindUniqueOrThrow: jest.Mock;
  let linkAttachmentsToMessage: jest.Mock;
  let deleteAllAttachmentsForThread: jest.Mock;
  let messageThreadDelete: jest.Mock;

  beforeEach(async () => {
    messageCreate = jest.fn().mockResolvedValue({ id: 'msg-1' });
    messageFindUniqueOrThrow = jest.fn().mockResolvedValue({
      id: 'msg-1',
      threadId: 'thread-1',
      body: '',
      createdAt: new Date(),
      senderId: viewer.sub,
      sender: {
        id: viewer.sub,
        email: viewer.email,
        firstName: null,
        lastName: null,
        profilePhotoUrl: null,
      },
      attachments: [
        {
          id: 'att-1',
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 100,
          createdAt: new Date(),
        },
      ],
    });
    linkAttachmentsToMessage = jest.fn().mockResolvedValue(undefined);
    deleteAllAttachmentsForThread = jest.fn().mockResolvedValue(1);
    messageThreadDelete = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: PrismaService,
          useValue: {
            messageThreadParticipant: {
              findUnique: jest.fn().mockResolvedValue({ id: 'part-1' }),
              findMany: jest.fn().mockResolvedValue([{ userId: viewer.sub }]),
            },
            message: {
              create: messageCreate,
              findUniqueOrThrow: messageFindUniqueOrThrow,
              findMany: jest.fn(),
            },
            messageThread: {
              update: jest.fn().mockResolvedValue(undefined),
              delete: messageThreadDelete,
            },
            $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
              cb({
                message: {
                  create: messageCreate,
                },
                messageThread: {
                  update: jest.fn().mockResolvedValue(undefined),
                },
              }),
            ),
          },
        },
        {
          provide: MessagingPolicyService,
          useValue: {},
        },
        {
          provide: RealtimeHubService,
          useValue: {
            emitToMany: jest.fn(),
          },
        },
        {
          provide: MessagingAttachmentService,
          useValue: {
            linkAttachmentsToMessage,
            deleteAllAttachmentsForThread,
          },
        },
      ],
    }).compile();

    service = module.get(MessagingService);
  });

  it('refuse un message vide sans pièce jointe', async () => {
    await expect(
      service.sendMessage('thread-1', { body: '   ' }, viewer),
    ).rejects.toThrow(BadRequestException);
  });

  it('envoie un message avec pièces jointes uniquement', async () => {
    const result = await service.sendMessage(
      'thread-1',
      { body: '', attachmentIds: ['att-1'] },
      viewer,
    );

    expect(linkAttachmentsToMessage).toHaveBeenCalledWith(
      'thread-1',
      'msg-1',
      ['att-1'],
      viewer,
    );
    expect(result.attachments).toHaveLength(1);
  });

  it('supprime une conversation et ses fichiers R2', async () => {
    const result = await service.deleteThread('thread-1', viewer);

    expect(deleteAllAttachmentsForThread).toHaveBeenCalledWith('thread-1');
    expect(messageThreadDelete).toHaveBeenCalledWith({ where: { id: 'thread-1' } });
    expect(result).toEqual({ ok: true });
  });
});
