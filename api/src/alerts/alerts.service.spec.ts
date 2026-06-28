jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const subsidiaryViewer: AuthenticatedUser = {
  sub: 'u-sub',
  email: 'm@filiale.local',
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
  firstLogin: false,
  role: { id: 'r1', name: 'MANAGER', description: null, poleCode: null },
};

describe('AlertsService', () => {
  let service: AlertsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: PrismaService,
          useValue: {
            stock: {
              findMany: jest.fn().mockResolvedValue([
                { quantity: 1, minQuantity: 5, product: { name: 'Riz' } },
              ]),
            },
            stockOrder: { count: jest.fn().mockResolvedValue(2) },
            stockTransfer: { count: jest.fn().mockResolvedValue(0) },
            sessionCaisse: { findFirst: jest.fn().mockResolvedValue(null) },
            budget: { findMany: jest.fn().mockResolvedValue([]) },
          },
        },
      ],
    }).compile();
    service = module.get(AlertsService);
  });

  it('retourne au moins une alerte stock bas', async () => {
    const alerts = await service.getDashboardAlerts(subsidiaryViewer);
    expect(alerts.some((a) => a.code === 'STOCK_LOW')).toBe(true);
    expect(alerts.some((a) => a.code === 'STOCK_ORDER_PENDING')).toBe(true);
  });
});
