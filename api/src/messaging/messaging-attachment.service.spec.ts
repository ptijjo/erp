jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { R2ObjectStorageService } from '../storage/r2-object-storage.service';
import { ImageProcessorService } from '../storage/image-processor.service';
import { MessagingAttachmentService } from './messaging-attachment.service';

const viewer: AuthenticatedUser = {
  sub: 'user-1',
  email: 'a@test.com',
  organisationId: 'org-1',
  organizationType: 'MAIN',
  role: { id: 'r1', name: 'ADMIN', poleCode: null },
};

function file(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'doc.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 100,
    buffer: Buffer.from('pdf'),
    stream: null as never,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  };
}

describe('MessagingAttachmentService', () => {
  let service: MessagingAttachmentService;
  let participantFindUnique: jest.Mock;
  let attachmentCreate: jest.Mock;
  let attachmentUpdate: jest.Mock;
  let attachmentDelete: jest.Mock;
  let attachmentCount: jest.Mock;
  let attachmentFindMany: jest.Mock;
  let attachmentFindUnique: jest.Mock;
  let attachmentUpdateMany: jest.Mock;
  let attachmentDeleteMany: jest.Mock;
  let participantFindMany: jest.Mock;
  let threadDelete: jest.Mock;
  let uploadPrivateFile: jest.Mock;
  let getObjectBody: jest.Mock;
  let deleteByKeys: jest.Mock;
  let processMessageAttachmentImage: jest.Mock;
  let lastCreatedAttachment: Record<string, unknown>;

  beforeEach(async () => {
    participantFindUnique = jest.fn().mockResolvedValue({ id: 'part-1' });
    attachmentCreate = jest.fn().mockImplementation(({ data }) => {
      lastCreatedAttachment = {
        id: 'att-1',
        threadId: 'thread-1',
        uploaderId: viewer.sub,
        storageKey: 'pending',
        createdAt: new Date('2026-07-15T10:00:00.000Z'),
        ...data,
      };
      return lastCreatedAttachment;
    });
    attachmentUpdate = jest.fn().mockImplementation(({ data }) => ({
      ...lastCreatedAttachment,
      ...data,
    }));
    attachmentDelete = jest.fn().mockResolvedValue(undefined);
    attachmentCount = jest.fn().mockResolvedValue(0);
    attachmentFindMany = jest.fn();
    attachmentFindUnique = jest.fn();
    attachmentUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    attachmentDeleteMany = jest.fn().mockResolvedValue({ count: 1 });
    participantFindMany = jest.fn().mockResolvedValue([]);
    threadDelete = jest.fn().mockResolvedValue(undefined);
    uploadPrivateFile = jest.fn().mockResolvedValue({ key: 'message-attachments/thread-1/att-1.pdf' });
    getObjectBody = jest.fn().mockResolvedValue({
      body: Buffer.from('pdf'),
      contentType: 'application/pdf',
      contentLength: 3,
    });
    deleteByKeys = jest.fn().mockResolvedValue(undefined);
    processMessageAttachmentImage = jest.fn().mockResolvedValue({
      buffer: Buffer.from('jpeg'),
      contentType: 'image/jpeg',
      extension: 'jpg',
      width: 800,
      height: 600,
      byteLength: 4,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingAttachmentService,
        {
          provide: PrismaService,
          useValue: {
            messageThreadParticipant: {
              findUnique: participantFindUnique,
            },
            messageAttachment: {
              create: attachmentCreate,
              update: attachmentUpdate,
              delete: attachmentDelete,
              count: attachmentCount,
              findMany: attachmentFindMany,
              findUnique: attachmentFindUnique,
              updateMany: attachmentUpdateMany,
              deleteMany: attachmentDeleteMany,
            },
            messageThreadParticipant: {
              findUnique: participantFindUnique,
              findMany: participantFindMany,
            },
            messageThread: {
              delete: threadDelete,
            },
          },
        },
        {
          provide: R2ObjectStorageService,
          useValue: {
            isConfigured: jest.fn().mockReturnValue(true),
            buildMessageAttachmentKey: jest
              .fn()
              .mockReturnValue('message-attachments/thread-1/att-1.pdf'),
            uploadPrivateFile,
            getObjectBody,
            deleteByKeys,
          },
        },
        {
          provide: ImageProcessorService,
          useValue: {
            processMessageAttachmentImage,
          },
        },
      ],
    }).compile();

    service = module.get(MessagingAttachmentService);
  });

  it('refuse les vidéos', () => {
    expect(() =>
      service.assertUploadableFile(
        file({ mimetype: 'video/mp4', originalname: 'clip.mp4' }),
      ),
    ).toThrow(BadRequestException);
  });

  it('refuse un format non autorisé', () => {
    expect(() =>
      service.assertUploadableFile(
        file({ mimetype: 'application/zip', originalname: 'archive.zip' }),
      ),
    ).toThrow(BadRequestException);
  });

  it('upload une image convertie en JPEG sur un fil', async () => {
    const result = await service.uploadToThread(
      'thread-1',
      file({ mimetype: 'image/webp', originalname: 'photo.webp' }),
      viewer,
    );

    expect(processMessageAttachmentImage).toHaveBeenCalled();
    expect(uploadPrivateFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Buffer),
      'image/jpeg',
    );
    expect(result.fileName).toBe('photo.jpg');
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('upload une pièce jointe PDF sur un fil', async () => {
    const result = await service.uploadToThread('thread-1', file(), viewer);

    expect(participantFindUnique).toHaveBeenCalled();
    expect(uploadPrivateFile).toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 'att-1',
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
    });
  });

  it('télécharge une pièce jointe pour un participant', async () => {
    attachmentFindUnique.mockResolvedValue({
      id: 'att-1',
      threadId: 'thread-1',
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
      storageKey: 'message-attachments/thread-1/att-1.pdf',
    });

    const result = await service.downloadAttachment('att-1', viewer);

    expect(result.fileName).toBe('doc.pdf');
    expect(result.body.toString()).toBe('pdf');
  });

  it('supprime les fichiers R2 d’un fil de conversation', async () => {
    attachmentFindMany.mockResolvedValue([
      { id: 'att-1', storageKey: 'message-attachments/thread-1/att-1.jpg' },
      { id: 'att-2', storageKey: 'message-attachments/thread-1/att-2.pdf' },
    ]);

    const count = await service.deleteAllAttachmentsForThread('thread-1');

    expect(count).toBe(2);
    expect(deleteByKeys).toHaveBeenCalledWith([
      'message-attachments/thread-1/att-1.jpg',
      'message-attachments/thread-1/att-2.pdf',
    ]);
  });

  it('purge les pièces jointes orphelines', async () => {
    attachmentFindMany.mockResolvedValue([
      { id: 'att-orphan', storageKey: 'message-attachments/thread-1/att-orphan.jpg' },
    ]);

    const result = await service.purgeOrphanAttachments(24);

    expect(result.deleted).toBe(1);
    expect(deleteByKeys).toHaveBeenCalled();
    expect(attachmentDeleteMany).toHaveBeenCalled();
  });

  it('supprime les conversations et fichiers R2 d’un utilisateur', async () => {
    participantFindMany.mockResolvedValue([{ threadId: 'thread-1' }]);
    attachmentFindMany.mockResolvedValue([
      { id: 'att-1', storageKey: 'message-attachments/thread-1/att-1.jpg' },
    ]);

    const count = await service.deleteAllThreadsForUser('user-1');

    expect(count).toBe(1);
    expect(deleteByKeys).toHaveBeenCalled();
    expect(threadDelete).toHaveBeenCalledWith({ where: { id: 'thread-1' } });
  });
});
