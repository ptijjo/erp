jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { ImageProcessorService } from '../storage/image-processor.service';
import { R2ObjectStorageService } from '../storage/r2-object-storage.service';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { EmployeeService } from '../hr/employee.service';
import { MessagingAttachmentService } from '../messaging/messaging-attachment.service';
import { mockAppCacheServiceProvider } from '../test/mocks/app-cache.mock';
import { UserService } from './user.service';

const viewer: AuthenticatedUser = {
  sub: 'admin-1',
  email: 'admin@vifaa.local',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  role: { id: 'r1', name: 'ADMIN', poleCode: null },
};

describe('UserService delete', () => {
  let service: UserService;
  let userFindFirst: jest.Mock;
  let userUpdate: jest.Mock;
  let sessionFindMany: jest.Mock;
  let deleteByPublicUrl: jest.Mock;
  let deleteAllThreadsForUser: jest.Mock;

  beforeEach(async () => {
    userFindFirst = jest.fn().mockResolvedValue({
      id: 'u-target',
      email: 'target@vifaa.local',
      organizationId: 'org-main',
      profilePhotoUrl: 'https://cdn.example/profile-photos/u-target/x.webp',
      createdAt: new Date(),
      updatedAt: new Date(),
      roleId: 'role-1',
      deletedAt: null,
      role: { pole: { code: 'Pole_FINANCE' } },
    });
    userUpdate = jest.fn().mockResolvedValue(undefined);
    sessionFindMany = jest.fn().mockResolvedValue([]);
    deleteByPublicUrl = jest.fn().mockResolvedValue(undefined);
    deleteAllThreadsForUser = jest.fn().mockResolvedValue(2);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: userFindFirst,
              update: userUpdate,
            },
            sessionCaisse: {
              findMany: sessionFindMany,
              update: jest.fn(),
            },
            vente: {
              count: jest.fn().mockResolvedValue(0),
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: ImageProcessorService,
          useValue: {},
        },
        {
          provide: R2ObjectStorageService,
          useValue: {
            deleteByPublicUrl,
          },
        },
        {
          provide: CaslAbilityFactory,
          useValue: {
            invalidateRole: jest.fn(),
          },
        },
        {
          provide: EmployeeService,
          useValue: {},
        },
        mockAppCacheServiceProvider,
        {
          provide: MessagingAttachmentService,
          useValue: {
            deleteAllThreadsForUser,
          },
        },
      ],
    }).compile();

    service = module.get(UserService);
  });

  it('soft-delete : photo R2, conversations, puis deletedAt (conserve l’historique caisse)', async () => {
    await service.delete('u-target', viewer);

    expect(deleteByPublicUrl).toHaveBeenCalledWith(
      'https://cdn.example/profile-photos/u-target/x.webp',
    );
    expect(deleteAllThreadsForUser).toHaveBeenCalledWith('u-target');
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u-target' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          email: expect.stringContaining('target@vifaa.local.deleted.'),
          profilePhotoUrl: null,
        }),
      }),
    );
  });

  it('refuse la suppression hors périmètre', async () => {
    const subsidiaryViewer: AuthenticatedUser = {
      sub: 'u-subs',
      email: 'user@filiale.local',
      organisationId: 'org-subsidiary',
      organizationType: 'SUBSIDIARY',
      role: { id: 'r1', name: 'MANAGER', poleCode: null },
    };

    userFindFirst.mockResolvedValue({
      id: 'u-target',
      email: 'target@vifaa.local',
      organizationId: 'org-other',
      profilePhotoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      roleId: 'role-1',
      deletedAt: null,
      role: { pole: { code: 'Pole_FINANCE' } },
    });

    await expect(service.delete('u-target', subsidiaryViewer)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('renvoie NotFound si utilisateur absent', async () => {
    userFindFirst.mockResolvedValue(null);

    await expect(service.delete('missing', viewer)).rejects.toThrow(
      NotFoundException,
    );
  });
});
