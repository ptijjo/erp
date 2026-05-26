jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('../product/product-subsidiary-scope.util', () => ({
  assertProductUsableForOrganization: jest.fn().mockResolvedValue(undefined),
}));

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VenteService } from './vente.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionCaisseService } from '../session-caisse/session-caisse.service';
import { AccountingPeriodService } from '../treasury/accounting-period.service';
import { NotificationService } from '../notification/notification.service';
import { RealtimeHubService } from '../realtime/realtime-hub.service';
import { VenteStatut } from '../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';

const subsidiaryViewer: AuthenticatedUser = {
  sub: 'u-sub',
  email: 'caisse@filiale.local',
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
  firstLogin: false,
  role: { id: 'r1', name: 'MANAGER', description: null, poleCode: null },
};

const draftVente = {
  id: 'vente-1',
  organizationId: 'org-sub',
  sessionCaisseId: 'sess-1',
  status: VenteStatut.DRAFT,
  totalAmount: 1000,
  lines: [
    {
      id: 'line-1',
      productId: 'prod-1',
      quantity: 2,
      unitPrice: 500,
      product: { id: 'prod-1', name: 'Riz' },
    },
  ],
};

describe('VenteService', () => {
  let service: VenteService;
  let venteFindUnique: jest.Mock;
  let stockFindUnique: jest.Mock;
  let transaction: jest.Mock;

  beforeEach(async () => {
    venteFindUnique = jest.fn().mockResolvedValue({
      ...draftVente,
      organization: { id: 'org-sub', organizationType: 'SUBSIDIARY' },
      user: null,
      paiements: [],
      lines: draftVente.lines.map((l) => ({
        ...l,
        product: {
          id: 'prod-1',
          name: 'Riz',
          qrCode: 'qr-1',
          price: 500,
          category: { id: 'c1', name: 'Alim' },
        },
      })),
    });
    stockFindUnique = jest.fn().mockResolvedValue({ quantity: 1 });
    transaction = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenteService,
        {
          provide: PrismaService,
          useValue: {
            vente: {
              findUnique: venteFindUnique,
              findUniqueOrThrow: venteFindUnique,
              update: jest.fn(),
            },
            venteLine: { findMany: jest.fn(), findFirst: jest.fn() },
            stock: { findUnique: stockFindUnique, update: jest.fn() },
            $transaction: transaction,
          },
        },
        {
          provide: SessionCaisseService,
          useValue: {
            requireOpenSessionForViewer: jest
              .fn()
              .mockResolvedValue({ id: 'sess-1', statut: 'OUVERTE' }),
            assertVenteBelongsToOpenSession: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AccountingPeriodService,
          useValue: {
            assertPeriodOpenForDate: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: NotificationService,
          useValue: { notifyUsersWithPermission: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(VenteService);
  });

  it('refuse la confirmation si le stock est insuffisant', async () => {
    await expect(
      service.confirm(
        'vente-1',
        { paiements: [{ modePaiement: 'ESPECES', amount: 1000 }] },
        subsidiaryViewer,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
