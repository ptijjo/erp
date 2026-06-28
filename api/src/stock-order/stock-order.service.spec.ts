jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('../product/product-subsidiary-scope.util', () => ({
  assertProductUsableForOrganization: jest.fn().mockResolvedValue(undefined),
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StockOrderService } from './stock-order.service';
import { BudgetStockLinkService } from '../budget/budget-stock-link.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { StockOrderStatus } from '../generated/prisma/client';

const mainViewer: AuthenticatedUser = {
  sub: 'u-main',
  email: 'dg@vifaa.local',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: { id: 'r1', name: 'ADMIN', description: null, poleCode: null },
};

const subsidiaryViewer: AuthenticatedUser = {
  ...mainViewer,
  sub: 'u-sub',
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
};

const pendingOrder = {
  id: 'order-1',
  subsidiaryOrganizationId: 'org-sub',
  productId: 'prod-1',
  supplierId: 'sup-1',
  quantity: 10,
  status: StockOrderStatus.PENDING,
  unitPrice: 100,
  product: { id: 'prod-1' },
  subsidiaryOrganization: {
    id: 'org-sub',
    organizationType: 'SUBSIDIARY' as const,
  },
};

describe('StockOrderService', () => {
  let service: StockOrderService;
  let findMany: jest.Mock;
  let findUnique: jest.Mock;
  let create: jest.Mock<
    Promise<unknown>,
    [
      {
        data: {
          subsidiaryOrganizationId: string;
          requestedByUserId: string;
          quantity: number;
          unitPrice: number;
        };
      },
    ]
  >;
  let update: jest.Mock<
    Promise<unknown>,
    [{ where: { id: string }; data: { status: StockOrderStatus } }]
  >;
  let organizationFindUnique: jest.Mock;
  let productSupplierFindUnique: jest.Mock;
  let supplierFindUnique: jest.Mock;
  let transaction: jest.Mock;
  let stockUpsert: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue([pendingOrder]);
    findUnique = jest.fn().mockResolvedValue(pendingOrder);
    create = jest
      .fn<
        Promise<unknown>,
        [
          {
            data: {
              subsidiaryOrganizationId: string;
              requestedByUserId: string;
              quantity: number;
              unitPrice: number;
            };
          },
        ]
      >()
      .mockResolvedValue({ ...pendingOrder, id: 'order-new' });
    update = jest
      .fn<
        Promise<unknown>,
        [{ where: { id: string }; data: { status: StockOrderStatus } }]
      >()
      .mockResolvedValue({
        ...pendingOrder,
        status: StockOrderStatus.CANCELLED,
      });
    organizationFindUnique = jest
      .fn()
      .mockResolvedValue({ organizationType: 'SUBSIDIARY' });
    productSupplierFindUnique = jest
      .fn()
      .mockResolvedValue({ productId: 'prod-1' });
    supplierFindUnique = jest.fn().mockResolvedValue({ price: 100 });
    stockUpsert = jest.fn().mockResolvedValue({});
    transaction = jest.fn(
      (
        cb: (tx: {
          stockOrder: { update: jest.Mock; findUniqueOrThrow: jest.Mock };
          stock: { upsert: jest.Mock };
        }) => unknown,
      ) => {
        const confirmedForBudget = {
          id: pendingOrder.id,
          subsidiaryOrganizationId: pendingOrder.subsidiaryOrganizationId,
          quantity: pendingOrder.quantity,
          unitPrice: pendingOrder.unitPrice,
          createdAt: new Date(),
          requestedByUserId: 'u-sub',
          product: { name: 'Produit test' },
        };
        const confirmedWithInclude = {
          ...pendingOrder,
          status: StockOrderStatus.CONFIRMED,
          budgetExpense: { id: 'exp-1', amount: 3000 },
        };
        const tx = {
          stockOrder: {
            update: jest.fn().mockResolvedValue({}),
            findUniqueOrThrow: jest
              .fn()
              .mockResolvedValueOnce(confirmedForBudget)
              .mockResolvedValueOnce(confirmedWithInclude),
          },
          stock: { upsert: stockUpsert },
          stockMovement: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockOrderService,
        {
          provide: BudgetStockLinkService,
          useValue: {
            recordExpenseForConfirmedStockOrder: jest
              .fn()
              .mockResolvedValue({ linked: true } as const),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            stockOrder: { findMany, findUnique, create, update },
            organization: { findUnique: organizationFindUnique },
            productSupplier: { findUnique: productSupplierFindUnique },
            supplier: { findUnique: supplierFindUnique },
            $transaction: transaction,
          },
        },
      ],
    }).compile();

    service = module.get<StockOrderService>(StockOrderService);
  });

  describe('findAll', () => {
    it('filtre par organisation pour une filiale', async () => {
      await service.findAll(subsidiaryViewer);
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { subsidiaryOrganizationId: 'org-sub' },
        }),
      );
    });

    it('valide le filtre filiale pour la maison mère', async () => {
      organizationFindUnique.mockResolvedValueOnce({
        organizationType: 'MAIN',
      });
      await expect(
        service.findAll(mainViewer, 'org-invalid'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('create', () => {
    const dto = {
      productId: 'prod-1',
      supplierId: 'sup-1',
      quantity: 5,
    };

    it('refuse la maison mère', async () => {
      await expect(service.create(dto, mainViewer)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('crée une commande PENDING pour la filiale', async () => {
      await service.create(dto, subsidiaryViewer);
      expect(create).toHaveBeenCalledTimes(1);
      const callArg = create.mock.calls[0][0];
      expect(callArg.data.subsidiaryOrganizationId).toBe('org-sub');
      expect(callArg.data.requestedByUserId).toBe('u-sub');
      expect(callArg.data.quantity).toBe(5);
      expect(callArg.data.unitPrice).toBe(100);
    });

    it('refuse si le fournisseur n’est pas lié au produit', async () => {
      productSupplierFindUnique.mockResolvedValueOnce(null);
      await expect(
        service.create(dto, subsidiaryViewer),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateStatus — maison mère', () => {
    it('peut refuser une commande en attente', async () => {
      await service.updateStatus(
        'order-1',
        StockOrderStatus.CANCELLED,
        mainViewer,
      );
      expect(update).toHaveBeenCalledTimes(1);
      const updateCall = update.mock.calls[0][0];
      expect(updateCall.where.id).toBe('order-1');
      expect(updateCall.data.status).toBe(StockOrderStatus.CANCELLED);
    });

    it('ne peut pas confirmer une commande', async () => {
      await expect(
        service.updateStatus('order-1', StockOrderStatus.CONFIRMED, mainViewer),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateStatus — filiale', () => {
    it('confirme la réception et incrémente le stock', async () => {
      const row = await service.updateStatus(
        'order-1',
        StockOrderStatus.CONFIRMED,
        subsidiaryViewer,
      );
      expect(transaction).toHaveBeenCalled();
      expect(stockUpsert).toHaveBeenCalled();
      expect(row.status).toBe(StockOrderStatus.CONFIRMED);
      expect(row.budgetLink).toEqual({ linked: true });
    });

    it('expose budgetLink non lié si le budget refuse la sortie', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          StockOrderService,
          {
            provide: BudgetStockLinkService,
            useValue: {
              recordExpenseForConfirmedStockOrder: jest.fn().mockResolvedValue({
                linked: false,
                reason: 'Solde insuffisant',
              }),
            },
          },
          {
            provide: PrismaService,
            useValue: {
              stockOrder: { findUnique, update },
              organization: { findUnique: organizationFindUnique },
              $transaction: transaction,
            },
          },
        ],
      }).compile();
      const svc = moduleRef.get(StockOrderService);
      const row = await svc.updateStatus(
        'order-1',
        StockOrderStatus.CONFIRMED,
        subsidiaryViewer,
      );
      expect(row.budgetLink).toEqual({
        linked: false,
        reason: 'Solde insuffisant',
      });
    });

    it('peut annuler une commande en attente', async () => {
      await service.updateStatus(
        'order-1',
        StockOrderStatus.CANCELLED,
        subsidiaryViewer,
      );
      expect(update).toHaveBeenCalled();
    });

    it('refuse un statut invalide', async () => {
      await expect(
        service.updateStatus(
          'order-1',
          'INVALID' as StockOrderStatus,
          subsidiaryViewer,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lève NotFoundException si commande absente', async () => {
      findUnique.mockResolvedValueOnce(null);
      await expect(
        service.updateStatus(
          'order-1',
          StockOrderStatus.CANCELLED,
          subsidiaryViewer,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
