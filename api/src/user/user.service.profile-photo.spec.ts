jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { ImageProcessorService } from '../storage/image-processor.service';
import { R2ObjectStorageService } from '../storage/r2-object-storage.service';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import type { AuthenticatedUser } from '../auth/auth.types';

const viewer: AuthenticatedUser = {
  sub: 'u-viewer',
  email: 'viewer@vifaa.local',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: { id: 'r1', name: 'DIRECTOR_FINANCE', description: null, poleCode: 'Pole_FINANCE' },
};

describe('UserService profile photo', () => {
  let service: UserService;
  let processProfileAvatar: jest.Mock;
  let uploadProfilePhoto: jest.Mock;
  let deleteByPublicUrl: jest.Mock;
  let userUpdate: jest.Mock;
  let userFindUnique: jest.Mock;

  beforeEach(async () => {
    processProfileAvatar = jest.fn().mockResolvedValue({
      buffer: Buffer.from('webp'),
      contentType: 'image/webp',
      extension: 'webp',
      width: 512,
      height: 512,
      byteLength: 4,
    });
    uploadProfilePhoto = jest.fn().mockResolvedValue({
      key: 'profile-photos/u-target/x.webp',
      publicUrl: 'https://cdn.example/profile-photos/u-target/x.webp',
    });
    deleteByPublicUrl = jest.fn().mockResolvedValue(undefined);
    userUpdate = jest.fn().mockResolvedValue({
      id: 'u-target',
      email: 'target@vifaa.local',
      profilePhotoUrl: 'https://cdn.example/profile-photos/u-target/x.webp',
      role: { id: 'r2', name: 'STAFF', description: null },
    });
    userFindUnique = jest.fn().mockResolvedValue({
      id: 'u-target',
      email: 'target@vifaa.local',
      organizationId: 'org-main',
      profilePhotoUrl: null,
      role: { pole: { code: 'Pole_FINANCE' } },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: userFindUnique,
              update: userUpdate,
            },
          },
        },
        {
          provide: ImageProcessorService,
          useValue: {
            processProfileAvatar,
          },
        },
        {
          provide: R2ObjectStorageService,
          useValue: {
            buildProfilePhotoKey: jest
              .fn()
              .mockReturnValue('profile-photos/u-target/x.webp'),
            uploadProfilePhoto,
            deleteByPublicUrl,
          },
        },
        {
          provide: CaslAbilityFactory,
          useValue: {
            createForUser: jest.fn().mockResolvedValue({
              can: (action: string, subject: string) =>
                action === 'update' && subject === 'User',
            }),
          },
        },
      ],
    }).compile();

    service = module.get(UserService);
  });

  it('refuse l’upload pour un autre utilisateur sans update:User', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: userFindUnique, update: userUpdate },
          },
        },
        {
          provide: ImageProcessorService,
          useValue: { processProfileAvatar },
        },
        {
          provide: R2ObjectStorageService,
          useValue: {
            buildProfilePhotoKey: jest.fn(),
            uploadProfilePhoto,
            deleteByPublicUrl,
          },
        },
        {
          provide: CaslAbilityFactory,
          useValue: {
            createForUser: jest.fn().mockResolvedValue({
              can: () => false,
            }),
          },
        },
      ],
    }).compile();
    const restrictedService = moduleRef.get(UserService);

    userFindUnique.mockResolvedValue({
      id: 'u-other',
      organizationId: 'org-other',
      profilePhotoUrl: null,
      role: { pole: { code: 'Pole_HR' } },
    });

    await expect(
      restrictedService.uploadProfilePhoto(
        'u-other',
        { buffer: Buffer.from('x'), mimetype: 'image/png', size: 3 } as Express.Multer.File,
        viewer,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('autorise un modérateur update:User à remplacer la photo d’un autre', async () => {
    userFindUnique.mockResolvedValue({
      id: 'u-target',
      organizationId: viewer.organisationId,
      profilePhotoUrl: 'https://cdn.example/old.webp',
      role: { pole: { code: 'Pole_FINANCE' } },
    });

    await service.uploadProfilePhoto(
      'u-target',
      { buffer: Buffer.from('x'), mimetype: 'image/png', size: 3 } as Express.Multer.File,
      viewer,
    );

    expect(processProfileAvatar).toHaveBeenCalled();
    expect(deleteByPublicUrl).toHaveBeenCalledWith('https://cdn.example/old.webp');
  });

  it('traite l’image via Sharp puis uploade sur R2 pour soi-même', async () => {
    userFindUnique.mockResolvedValue({
      id: viewer.sub,
      organizationId: viewer.organisationId,
      profilePhotoUrl: null,
      role: { pole: { code: 'Pole_FINANCE' } },
    });
    userUpdate.mockResolvedValue({
      id: viewer.sub,
      email: viewer.email,
      profilePhotoUrl: 'https://cdn.example/profile-photos/u-target/x.webp',
      role: { id: 'r2', name: 'STAFF', description: null },
    });

    const file = {
      buffer: Buffer.from('png'),
      mimetype: 'image/png',
      size: 100,
    } as Express.Multer.File;

    const result = await service.uploadProfilePhoto(viewer.sub, file, viewer);

    expect(processProfileAvatar).toHaveBeenCalledWith(file);
    expect(uploadProfilePhoto).toHaveBeenCalled();
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: viewer.sub },
        data: {
          profilePhotoUrl: 'https://cdn.example/profile-photos/u-target/x.webp',
        },
      }),
    );
    expect(result.profilePhotoUrl).toBe(
      'https://cdn.example/profile-photos/u-target/x.webp',
    );
  });

  it('permet à l’utilisateur de modifier sa propre photo', async () => {
    userFindUnique.mockResolvedValue({
      id: viewer.sub,
      organizationId: viewer.organisationId,
      profilePhotoUrl: null,
      role: { pole: { code: 'Pole_FINANCE' } },
    });

    await service.uploadProfilePhoto(
      viewer.sub,
      { buffer: Buffer.from('x'), mimetype: 'image/jpeg', size: 50 } as Express.Multer.File,
      viewer,
    );

    expect(processProfileAvatar).toHaveBeenCalled();
  });
});
