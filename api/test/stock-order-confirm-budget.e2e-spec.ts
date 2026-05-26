import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import {
  buildE2eSubsidiaryUserRow,
  E2E_SUBSIDIARY_EMAIL,
  E2E_SUBSIDIARY_ORG_ID,
  E2E_SUBSIDIARY_ROLE_ID,
  E2E_TEST_PASSWORD,
  hashE2ePassword,
} from './helpers/auth-e2e.fixtures';
import { createAuthPrismaMock } from './helpers/auth-prisma.mock';
import { createAuthE2eApp, type E2eAppContext } from './helpers/create-e2e-app';
import { OrganizationType, StockOrderStatus } from '../src/generated/prisma/client';

describe('StockOrder confirm + budget (e2e)', () => {
  let ctx: E2eAppContext;
  let app: INestApplication;
  let prismaMock: ReturnType<typeof createAuthPrismaMock>;

  const orderId = 'e2e-order-pending';
  const pendingOrder = {
    id: orderId,
    subsidiaryOrganizationId: E2E_SUBSIDIARY_ORG_ID,
    productId: 'prod-1',
    supplierId: 'sup-1',
    quantity: 2,
    unitPrice: 1500,
    status: StockOrderStatus.PENDING,
    note: null,
    requestedByUserId: 'e2e-subsidiary-user-id',
    createdAt: new Date('2026-05-20T10:00:00.000Z'),
    updatedAt: new Date('2026-05-20T10:00:00.000Z'),
    product: { id: 'prod-1', name: 'Riz' },
    subsidiaryOrganization: {
      id: E2E_SUBSIDIARY_ORG_ID,
      organizationType: OrganizationType.SUBSIDIARY,
    },
  };

  const confirmedInclude = {
    ...pendingOrder,
    status: StockOrderStatus.CONFIRMED,
    product: {
      id: 'prod-1',
      name: 'Riz',
      category: { id: 'c1', name: 'Alimentation' },
      productSuppliers: [],
    },
    subsidiaryOrganization: {
      id: E2E_SUBSIDIARY_ORG_ID,
      name: 'Filiale E2E',
      slug: 'filiale-e2e',
      organizationType: OrganizationType.SUBSIDIARY,
    },
    supplier: { id: 'sup-1', name: 'Fournisseur E2E' },
    requestedBy: { id: 'e2e-subsidiary-user-id', email: E2E_SUBSIDIARY_EMAIL },
    budgetExpense: { id: 'exp-stock-1', amount: 3000 },
  };

  beforeAll(async () => {
    const hash = await hashE2ePassword();
    const subsidiaryUser = buildE2eSubsidiaryUserRow(hash);
    prismaMock = createAuthPrismaMock(subsidiaryUser, {
      permissionRolesByRoleId: {
        [E2E_SUBSIDIARY_ROLE_ID]: [
          { permission: { name: 'read:StockOrder' } },
          { permission: { name: 'update:StockOrder' } },
        ],
      },
    });

    prismaMock.budget = {
      findFirst: jest.fn().mockResolvedValue({ id: 'budget-1' }),
    };
    prismaMock.budgetLine = {
      findFirst: jest.fn().mockResolvedValue({
        id: 'line-stock',
        amountPlanned: 100000,
      }),
    };
    prismaMock.budgetExpense = {
      findUnique: jest.fn().mockResolvedValue(null),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      create: jest.fn().mockResolvedValue({ id: 'exp-stock-1' }),
    };

    prismaMock.stockOrder = {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(pendingOrder),
      update: jest.fn(),
    };

    prismaMock.$transaction = jest.fn(async (cb: (tx: unknown) => unknown) => {
      const tx = {
        stockOrder: {
          update: jest.fn().mockResolvedValue({}),
          findUniqueOrThrow: jest
            .fn()
            .mockResolvedValueOnce({
              id: orderId,
              subsidiaryOrganizationId: E2E_SUBSIDIARY_ORG_ID,
              quantity: 2,
              unitPrice: 1500,
              createdAt: pendingOrder.createdAt,
              requestedByUserId: pendingOrder.requestedByUserId,
              product: { name: 'Riz' },
            })
            .mockResolvedValueOnce(confirmedInclude),
        },
        stock: { upsert: jest.fn().mockResolvedValue({}) },
        budget: prismaMock.budget,
        budgetLine: prismaMock.budgetLine,
        budgetExpense: prismaMock.budgetExpense,
      };
      return cb(tx);
    });

    ctx = await createAuthE2eApp(prismaMock);
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('PATCH confirm expose budgetLink.linked après réception', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_SUBSIDIARY_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent
      .patch(`/stock-order/${orderId}/status`)
      .send({ status: StockOrderStatus.CONFIRMED })
      .expect(200);

    expect(res.body.status).toBe(StockOrderStatus.CONFIRMED);
    expect(res.body.budgetLink).toEqual({ linked: true });
    expect(ctx.prisma.budgetExpense?.create).toHaveBeenCalled();
  });
});
