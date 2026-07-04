import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { mockPrismaServiceProvider } from '../test/mocks/prisma-service.mock';
import { ImageProcessorService } from '../storage/image-processor.service';
import { R2ObjectStorageService } from '../storage/r2-object-storage.service';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import type { AuthenticatedUser } from '../auth/auth.types';

describe('UserService.updateMyProfile', () => {
  let service: UserService;
  let prismaUserUpdate: jest.Mock;

  beforeEach(async () => {
    prismaUserUpdate = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'a@vifaa.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      bio: 'Mathématicienne',
      profilePhotoUrl: null,
      firstLogin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationId: 'org-1',
      roleId: 'role-1',
      role: { id: 'role-1', name: 'ADMIN', description: null },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        mockPrismaServiceProvider({
          user: {
            update: prismaUserUpdate,
          },
        }),
        {
          provide: ImageProcessorService,
          useValue: { processProfileAvatar: jest.fn() },
        },
        {
          provide: R2ObjectStorageService,
          useValue: {
            buildProfilePhotoKey: jest.fn(),
            uploadProfilePhoto: jest.fn(),
            deleteByPublicUrl: jest.fn(),
          },
        },
        {
          provide: CaslAbilityFactory,
          useValue: { createForUser: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('met à jour uniquement la bio du profil connecté', async () => {
    const result = await service.updateMyProfile('user-1', {
      bio: ' Mathématicienne ',
    });

    expect(prismaUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { bio: 'Mathématicienne' },
      include: { role: true },
    });
    expect(result.bio).toBe('Mathématicienne');
    expect(result).not.toHaveProperty('password');
  });

  it('efface la bio vide', async () => {
    await service.updateMyProfile('user-1', { bio: '' });

    expect(prismaUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { bio: null },
      include: { role: true },
    });
  });
});

describe('UserService.update identity fields', () => {
  let service: UserService;
  let prismaUserFindUnique: jest.Mock;
  let prismaUserUpdate: jest.Mock;

  const existingUser = {
    id: 'user-2',
    email: 'b@vifaa.com',
    password: 'hash',
    firstName: 'Jean',
    lastName: 'Dupont',
    profilePhotoUrl: null,
    bio: null,
    firstLogin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    organizationId: 'org-1',
    roleId: 'role-2',
    role: {
      id: 'role-2',
      name: 'MANAGER',
      description: null,
      pole: { code: 'OPS' },
    },
  };

  const subsidiaryViewer: AuthenticatedUser = {
    sub: 'viewer-1',
    email: 'mgr@vifaa.com',
    organisationId: 'org-1',
    organizationType: 'SUBSIDIARY',
    organizationSlug: 'filiale',
    role: { id: 'r1', name: 'SUBSIDIARY_MANAGER', poleCode: null },
    organisationName: 'Filiale',
    firstLogin: false,
    permissionMode: 'ROLE_PERMISSIONS',
    permissions: ['update:user'],
  };

  const adminViewer: AuthenticatedUser = {
    ...subsidiaryViewer,
    sub: 'admin-1',
    email: 'admin@vifaa.com',
    role: { id: 'r-admin', name: 'ADMIN', poleCode: null },
    permissionMode: 'FULL_ACCESS',
    permissions: [],
  };

  beforeEach(async () => {
    prismaUserFindUnique = jest.fn().mockResolvedValue(existingUser);
    prismaUserUpdate = jest.fn().mockResolvedValue({
      ...existingUser,
      firstName: 'Marie',
      role: existingUser.role,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        mockPrismaServiceProvider({
          user: {
            findUnique: prismaUserFindUnique,
            update: prismaUserUpdate,
          },
          role: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'role-2',
              organizationId: 'org-1',
              organizationScopeId: 'org-1',
              pole: { code: 'OPS' },
            }),
          },
          organization: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'org-1',
              organizationType: 'SUBSIDIARY',
            }),
          },
        }),
        {
          provide: ImageProcessorService,
          useValue: { processProfileAvatar: jest.fn() },
        },
        {
          provide: R2ObjectStorageService,
          useValue: {
            buildProfilePhotoKey: jest.fn(),
            uploadProfilePhoto: jest.fn(),
            deleteByPublicUrl: jest.fn(),
          },
        },
        {
          provide: CaslAbilityFactory,
          useValue: { createForUser: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('refuse la modification du prénom sans rôle autorisé', async () => {
    await expect(
      service.update('user-2', { firstName: 'Marie' }, subsidiaryViewer),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prismaUserUpdate).not.toHaveBeenCalled();
  });

  it('autorise ADMIN à modifier le prénom', async () => {
    await service.update('user-2', { firstName: 'Marie' }, adminViewer);

    expect(prismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ firstName: 'Marie' }),
      }),
    );
  });
});
