import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import {
  buildE2eUserRow,
  E2E_TEST_EMAIL,
  E2E_TEST_PASSWORD,
  hashE2ePassword,
} from './helpers/auth-e2e.fixtures';
import { createAuthPrismaMock } from './helpers/auth-prisma.mock';
import { createAuthE2eApp, type E2eAppContext } from './helpers/create-e2e-app';

describe('Analytics (e2e)', () => {
  let ctx: E2eAppContext;
  let app: INestApplication;

  beforeAll(async () => {
    const hash = await hashE2ePassword();
    const userRow = buildE2eUserRow(hash);
    const prismaMock = createAuthPrismaMock(userRow);

    prismaMock.budget = {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    };
    prismaMock.budgetSupplementRequest = { count: jest.fn().mockResolvedValue(0) };
    prismaMock.stockOrder = {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    };
    prismaMock.budgetExpense = { findMany: jest.fn().mockResolvedValue([]) };
    prismaMock.employee = {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    };
    prismaMock.leaveRequest = {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    };
    prismaMock.stock = { findMany: jest.fn().mockResolvedValue([]) };
    prismaMock.product = { count: jest.fn().mockResolvedValue(0) };
    prismaMock.organization = {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    };

    ctx = await createAuthE2eApp(prismaMock);
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /analytics/overview retourne 401 sans session', async () => {
    await request(app.getHttpServer()).get('/analytics/overview').expect(401);
  });

  it('GET /analytics/overview retourne une synthèse pour ADMIN', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent
      .get('/analytics/overview')
      .query({ year: 2026 })
      .expect(200);

    expect(res.body.scope).toBe('MAIN');
    expect(res.body.year).toBe(2026);
    expect(res.body.budget).toBeDefined();
  });
});
