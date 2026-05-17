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

describe('StockOrder (e2e)', () => {
  let ctx: E2eAppContext;
  let app: INestApplication;

  beforeAll(async () => {
    const hash = await hashE2ePassword();
    const userRow = buildE2eUserRow(hash);
    const prismaMock = createAuthPrismaMock(userRow);
    prismaMock.stockOrder = {
      findMany: jest.fn().mockResolvedValue([]),
    };
    ctx = await createAuthE2eApp(prismaMock);
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /stock-order retourne 401 sans session', async () => {
    await request(app.getHttpServer()).get('/stock-order').expect(401);
  });

  it('GET /stock-order retourne 200 pour un ADMIN authentifié', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent.get('/stock-order').expect(200);
    expect(res.body).toEqual([]);
  });
});
