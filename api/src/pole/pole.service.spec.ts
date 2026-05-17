jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PoleService } from './pole.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const mainViewer: AuthenticatedUser = {
  sub: 'u1',
  email: 'a@b.c',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: {
    id: 'r1',
    name: 'ADMIN',
    description: null,
    poleCode: null,
  },
};

const subsidiaryViewer: AuthenticatedUser = {
  ...mainViewer,
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
};

describe('PoleService', () => {
  let service: PoleService;
  let findMany: jest.Mock;
  let create: jest.Mock;

  const poles = [
    {
      id: 'p1',
      code: 'Pole_OPERATIONS',
      name: 'Pôle opérations',
      description: 'Ops',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue(poles);
    create = jest.fn().mockImplementation((args: { data: { code: string } }) =>
      Promise.resolve({
        id: 'new-id',
        ...args.data,
        description: args.data.description ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoleService,
        {
          provide: PrismaService,
          useValue: {
            pole: { findMany, create },
          },
        },
      ],
    }).compile();

    service = module.get<PoleService>(PoleService);
  });

  describe('findAll', () => {
    it('refuse les utilisateurs hors maison mère', async () => {
      await expect(service.findAll(subsidiaryViewer)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(findMany).not.toHaveBeenCalled();
    });

    it('retourne les pôles triés par code pour la maison mère', async () => {
      const result = await service.findAll(mainViewer);
      expect(result).toEqual(poles);
      expect(findMany).toHaveBeenCalledWith({ orderBy: { code: 'asc' } });
    });
  });

  describe('create', () => {
    it('refuse les utilisateurs hors maison mère', async () => {
      await expect(
        service.create(
          { code: 'Pole_X', name: 'Test', description: undefined },
          subsidiaryViewer,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(create).not.toHaveBeenCalled();
    });

    it('crée un pôle pour la maison mère', async () => {
      const row = await service.create(
        { code: 'Pole_X', name: 'Pôle test', description: 'd' },
        mainViewer,
      );
      expect(create).toHaveBeenCalledWith({
        data: {
          code: 'Pole_X',
          name: 'Pôle test',
          description: 'd',
        },
      });
      expect(row.code).toBe('Pole_X');
      expect(row.name).toBe('Pôle test');
    });

    it('lève ConflictException si le code existe déjà', async () => {
      create.mockRejectedValueOnce({ code: 'P2002' });
      await expect(
        service.create(
          { code: 'Pole_DUP', name: 'Doublon' },
          mainViewer,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
