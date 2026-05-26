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
import {
  SessionCaisseStatut,
  VenteStatut,
} from '../src/generated/prisma/client';

describe('Vente (e2e)', () => {
  let ctx: E2eAppContext;
  let app: INestApplication;

  beforeAll(async () => {
    const hash = await hashE2ePassword();
    const subsidiaryUser = buildE2eSubsidiaryUserRow(hash);
    const prismaMock = createAuthPrismaMock(subsidiaryUser, {
      permissionRolesByRoleId: {
        [E2E_SUBSIDIARY_ROLE_ID]: [
          { permission: { name: 'read:Vente' } },
          { permission: { name: 'create:Vente' } },
          { permission: { name: 'update:Vente' } },
          { permission: { name: 'read:SessionCaisse' } },
          { permission: { name: 'create:SessionCaisse' } },
        ],
      },
    });

    prismaMock.sessionCaisse = {
      findFirst: jest.fn().mockResolvedValue({
        id: 'sess-vente-e2e',
        organizationId: E2E_SUBSIDIARY_ORG_ID,
        userId: subsidiaryUser.id,
        statut: SessionCaisseStatut.OUVERTE,
      }),
    };

    prismaMock.vente = {
      create: jest.fn().mockResolvedValue({
        id: 'vente-new',
        status: VenteStatut.DRAFT,
        totalAmount: 0,
        sessionCaisseId: 'sess-vente-e2e',
        numeroTicket: null,
        organizationId: E2E_SUBSIDIARY_ORG_ID,
        organization: {
          id: E2E_SUBSIDIARY_ORG_ID,
          name: 'Filiale',
          slug: 'filiale',
          organizationType: 'SUBSIDIARY',
        },
        user: { id: 'e2e-subsidiary-user-id', email: E2E_SUBSIDIARY_EMAIL },
        lines: [],
        paiements: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findMany: jest.fn().mockResolvedValue([]),
    };

    ctx = await createAuthE2eApp(prismaMock);
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /vente retourne 401 sans session', async () => {
    await request(app.getHttpServer()).post('/vente').expect(401);
  });

  it('POST /vente crée un brouillon pour la filiale', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_SUBSIDIARY_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent.post('/vente').expect(201);
    expect(res.body.status).toBe(VenteStatut.DRAFT);
    expect(ctx.prisma.vente?.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionCaisseId: 'sess-vente-e2e',
        }),
      }),
    );
  });

  it('POST /vente sans session ouverte retourne 400', async () => {
    const hash = await hashE2ePassword();
    const subsidiaryUser = buildE2eSubsidiaryUserRow(hash);
    const prismaMock = createAuthPrismaMock(subsidiaryUser, {
      permissionRolesByRoleId: {
        [E2E_SUBSIDIARY_ROLE_ID]: [
          { permission: { name: 'create:Vente' } },
          { permission: { name: 'create:SessionCaisse' } },
        ],
      },
    });
    prismaMock.sessionCaisse = {
      findFirst: jest.fn().mockResolvedValue(null),
    };
    const localCtx = await createAuthE2eApp(prismaMock);
    const agent = request.agent(localCtx.app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_SUBSIDIARY_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);
    await agent.post('/vente').expect(400);
    await localCtx.app.close();
  });
});
