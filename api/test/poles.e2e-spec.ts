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

describe('Poles (e2e)', () => {
  let ctx: E2eAppContext;
  let app: INestApplication;

  const polesFixture = [
    {
      id: 'pole-1',
      code: 'Pole_OPERATIONS',
      name: 'Pôle opérations',
      description: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ];

  beforeAll(async () => {
    const hash = await hashE2ePassword();
    const userRow = buildE2eUserRow(hash);
    const prismaMock = createAuthPrismaMock(userRow);
    prismaMock.pole = {
      findMany: jest.fn().mockResolvedValue(polesFixture),
    };
    ctx = await createAuthE2eApp(prismaMock);
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /poles retourne 401 sans session', async () => {
    await request(app.getHttpServer()).get('/poles').expect(401);
  });

  it('GET /poles retourne la liste pour un utilisateur authentifié ADMIN', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent.get('/poles').expect(200);
    expect(res.body).toEqual([
      {
        ...polesFixture[0],
        createdAt: polesFixture[0].createdAt.toISOString(),
        updatedAt: polesFixture[0].updatedAt.toISOString(),
      },
    ]);
  });
});
