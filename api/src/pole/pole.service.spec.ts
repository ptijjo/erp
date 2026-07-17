jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
  let findUnique: jest.Mock;
  let create: jest.Mock;
  let update: jest.Mock;
  let remove: jest.Mock;

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

  const customPole = {
    id: 'p-custom',
    code: 'Pole_CUSTOM',
    name: 'Pôle custom',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue(poles);
    findUnique = jest.fn().mockResolvedValue(poles[0]);
    create = jest.fn().mockImplementation((args: { data: { code: string } }) =>
      Promise.resolve({
        id: 'new-id',
        ...args.data,
        description: args.data.description ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    update = jest.fn().mockImplementation(
      (args: { where: { id: string }; data: Record<string, unknown> }) =>
        Promise.resolve({ ...poles[0], ...args.data, id: args.where.id }),
    );
    remove = jest.fn().mockResolvedValue(customPole);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoleService,
        {
          provide: PrismaService,
          useValue: {
            pole: { findMany, findUnique, create, update, delete: remove },
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

  describe('findOne', () => {
    it('refuse hors maison mère', async () => {
      await expect(
        service.findOne('p1', subsidiaryViewer),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lève NotFound si absent', async () => {
      findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('x', mainViewer)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('retourne le pôle', async () => {
      await expect(service.findOne('p1', mainViewer)).resolves.toEqual(
        poles[0],
      );
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
        service.create({ code: 'Pole_DUP', name: 'Doublon' }, mainViewer),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('refuse hors maison mère', async () => {
      await expect(
        service.update('p1', { name: 'X' }, subsidiaryViewer),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuse de changer le code d’un pôle système', async () => {
      findUnique.mockResolvedValueOnce(poles[0]);
      await expect(
        service.update('p1', { code: 'Pole_OTHER' }, mainViewer),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(update).not.toHaveBeenCalled();
    });

    it('autorise name/description sur un pôle système', async () => {
      findUnique.mockResolvedValueOnce(poles[0]);
      await service.update(
        'p1',
        { name: 'Ops renommé', description: 'nouvelle desc' },
        mainViewer,
      );
      expect(update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { name: 'Ops renommé', description: 'nouvelle desc' },
      });
    });

    it('autorise le changement de code d’un pôle custom', async () => {
      findUnique.mockResolvedValueOnce(customPole);
      await service.update('p-custom', { code: 'Pole_RENAMED' }, mainViewer);
      expect(update).toHaveBeenCalledWith({
        where: { id: 'p-custom' },
        data: { code: 'Pole_RENAMED' },
      });
    });
  });

  describe('remove', () => {
    it('refuse hors maison mère', async () => {
      await expect(
        service.remove('p-custom', subsidiaryViewer),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('supprime un pôle (rôles détachés via SetNull Prisma)', async () => {
      findUnique.mockResolvedValueOnce(poles[0]);
      remove.mockResolvedValueOnce(poles[0]);
      await expect(service.remove('p1', mainViewer)).resolves.toEqual(poles[0]);
      expect(remove).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });

    it('supprime un pôle custom', async () => {
      findUnique.mockResolvedValueOnce(customPole);
      await expect(service.remove('p-custom', mainViewer)).resolves.toEqual(
        customPole,
      );
      expect(remove).toHaveBeenCalledWith({ where: { id: 'p-custom' } });
    });
  });
});
