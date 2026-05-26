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
import { SessionCaisseStatut } from '../src/generated/prisma/client';

describe('SessionCaisse (e2e)', () => {
  let ctx: E2eAppContext;
  let app: INestApplication;
  let openSessionId: string;

  beforeAll(async () => {
    const hash = await hashE2ePassword();
    const subsidiaryUser = buildE2eSubsidiaryUserRow(hash);
    openSessionId = 'sess-e2e-1';

    const prismaMock = createAuthPrismaMock(subsidiaryUser, {
      permissionRolesByRoleId: {
        [E2E_SUBSIDIARY_ROLE_ID]: [
          { permission: { name: 'read:SessionCaisse' } },
          { permission: { name: 'create:SessionCaisse' } },
          { permission: { name: 'update:SessionCaisse' } },
        ],
      },
    });

    prismaMock.sessionCaisse = {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue({
        id: openSessionId,
        organizationId: E2E_SUBSIDIARY_ORG_ID,
        userId: subsidiaryUser.id,
        statut: SessionCaisseStatut.OUVERTE,
        fondOuverture: 10000,
        ventes: [],
      }),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: openSessionId,
        ...data,
        statut: SessionCaisseStatut.OUVERTE,
        openedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: {
          id: E2E_SUBSIDIARY_ORG_ID,
          name: 'Filiale',
          slug: 'filiale',
          organizationType: 'SUBSIDIARY',
        },
        user: {
          id: subsidiaryUser.id,
          email: E2E_SUBSIDIARY_EMAIL,
          firstName: null,
          lastName: null,
        },
        closedBy: null,
        ventes: [],
      })),
      update: jest.fn().mockImplementation(async ({ where, data }) => ({
        id: where.id,
        organizationId: E2E_SUBSIDIARY_ORG_ID,
        userId: subsidiaryUser.id,
        statut: SessionCaisseStatut.CLOTUREE,
        fondOuverture: 10000,
        fondCloture: data.fondCloture,
        ecartCloture: data.ecartCloture,
        ...data,
        organization: {
          id: E2E_SUBSIDIARY_ORG_ID,
          name: 'Filiale',
          slug: 'filiale',
          organizationType: 'SUBSIDIARY',
        },
        user: {
          id: subsidiaryUser.id,
          email: E2E_SUBSIDIARY_EMAIL,
          firstName: null,
          lastName: null,
        },
        closedBy: null,
        ventes: [],
        openedAt: new Date(),
        closedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    prismaMock.vente = {
      count: jest.fn().mockResolvedValue(0),
    };

    ctx = await createAuthE2eApp(prismaMock);
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /session-caisse/open retourne 401 sans session', async () => {
    await request(app.getHttpServer())
      .post('/session-caisse/open')
      .send({ fondOuverture: 5000 })
      .expect(401);
  });

  it('POST /session-caisse/open ouvre une session filiale', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_SUBSIDIARY_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent
      .post('/session-caisse/open')
      .send({ fondOuverture: 10000 })
      .expect(201);

    expect(res.body.statut).toBe(SessionCaisseStatut.OUVERTE);
    expect(res.body.live).toBeDefined();
    expect(ctx.prisma.sessionCaisse?.create).toHaveBeenCalled();
  });

  it('GET /session-caisse/current retourne la session ouverte', async () => {
    ctx.prisma.sessionCaisse!.findFirst = jest.fn().mockResolvedValue({
      id: openSessionId,
      organizationId: E2E_SUBSIDIARY_ORG_ID,
      userId: 'e2e-subsidiary-user-id',
      statut: SessionCaisseStatut.OUVERTE,
      fondOuverture: 10000,
      openedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      closedAt: null,
      fondCloture: null,
      ecartCloture: null,
      commentaireCloture: null,
      totalVentesFcfa: null,
      totalEspecesFcfa: null,
      totalCarteFcfa: null,
      totalMobileMoneyFcfa: null,
      nombreVentes: null,
      organization: {
        id: E2E_SUBSIDIARY_ORG_ID,
        name: 'Filiale',
        slug: 'filiale',
        organizationType: 'SUBSIDIARY',
      },
      user: {
        id: 'e2e-subsidiary-user-id',
        email: E2E_SUBSIDIARY_EMAIL,
        firstName: null,
        lastName: null,
      },
      closedBy: null,
      ventes: [],
    });

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_SUBSIDIARY_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent.get('/session-caisse/current').expect(200);
    expect(res.body?.statut).toBe(SessionCaisseStatut.OUVERTE);
  });
});
