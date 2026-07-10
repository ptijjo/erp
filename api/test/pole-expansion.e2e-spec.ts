import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import {
  buildE2eUserRow,
  E2E_TEST_EMAIL,
  E2E_TEST_PASSWORD,
  hashE2ePassword,
} from './helpers/auth-e2e.fixtures';
import { createAuthPrismaMock, type AuthPrismaMock } from './helpers/auth-prisma.mock';
import { createPoleExpansionE2eApp, type PoleExpansionE2eContext } from './helpers/create-pole-expansion-e2e-app';

const ORG_ID = '11111111-1111-4111-8111-111111111111';

function attachPoleModuleMocks(prismaMock: AuthPrismaMock): void {
  const strategyRow = {
    id: 'strategy-1',
    title: 'Expansion filiales',
    description: null,
    status: 'PLANNED' as const,
    priority: 3,
    targetDate: null,
    budgetEstimate: null,
    organizationId: ORG_ID,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  };

  prismaMock.strategyProject = {
    findMany: jest.fn().mockResolvedValue([strategyRow]),
    findUnique: jest.fn().mockResolvedValue(strategyRow),
    create: jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({
        ...strategyRow,
        id: 'strategy-new',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    update: jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ ...strategyRow, ...data }),
    ),
    delete: jest.fn().mockResolvedValue(strategyRow),
  };

  const campaignRow = {
    id: 'campaign-1',
    title: 'Campagne printemps',
    channel: 'Réseaux sociaux',
    description: null,
    status: 'DRAFT' as const,
    startDate: null,
    endDate: null,
    budget: null,
    organizationId: ORG_ID,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  };

  prismaMock.marketingCampaign = {
    findMany: jest.fn().mockResolvedValue([campaignRow]),
    findUnique: jest.fn().mockResolvedValue(campaignRow),
    create: jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({
        ...campaignRow,
        id: 'campaign-new',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    update: jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ ...campaignRow, ...data }),
    ),
    delete: jest.fn().mockResolvedValue(campaignRow),
  };

  const eventRow = {
    id: 'spiritual-1',
    title: 'Cérémonie annuelle',
    description: null,
    location: 'Temple central',
    eventDate: new Date('2026-12-01T00:00:00.000Z'),
    status: 'PLANNED' as const,
    organizationId: ORG_ID,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  };

  prismaMock.spiritualEvent = {
    findMany: jest.fn().mockResolvedValue([eventRow]),
    findUnique: jest.fn().mockResolvedValue(eventRow),
    create: jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({
        ...eventRow,
        id: 'spiritual-new',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    update: jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ ...eventRow, ...data }),
    ),
    delete: jest.fn().mockResolvedValue(eventRow),
  };

  const accountRow = {
    id: 'account-1',
    code: '601',
    name: 'Achats',
    accountType: 'EXPENSE' as const,
    isActive: true,
    organizationId: ORG_ID,
    parentId: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  };

  prismaMock.chartAccount = {
    findMany: jest.fn().mockResolvedValue([accountRow]),
    findUnique: jest.fn().mockResolvedValue(accountRow),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({
        ...accountRow,
        id: 'account-new',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    update: jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ ...accountRow, ...data }),
    ),
    delete: jest.fn().mockResolvedValue(accountRow),
  };

  const journalRow = {
    id: 'journal-1',
    entryDate: new Date('2026-06-15T00:00:00.000Z'),
    reference: 'JE-001',
    description: 'Test',
    status: 'DRAFT' as const,
    organizationId: ORG_ID,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    lines: [
      {
        id: 'line-1',
        label: 'Débit',
        debit: { toString: () => '100' },
        credit: { toString: () => '0' },
        journalEntryId: 'journal-1',
        chartAccountId: 'account-1',
        chartAccount: {
          id: 'account-1',
          code: '601',
          name: 'Achats',
          accountType: 'EXPENSE',
        },
      },
      {
        id: 'line-2',
        label: 'Crédit',
        debit: { toString: () => '0' },
        credit: { toString: () => '100' },
        journalEntryId: 'journal-1',
        chartAccountId: 'account-1',
        chartAccount: {
          id: 'account-1',
          code: '601',
          name: 'Achats',
          accountType: 'EXPENSE',
        },
      },
    ],
  };

  prismaMock.journalEntry = {
    findMany: jest.fn().mockResolvedValue([journalRow]),
    findUnique: jest.fn().mockResolvedValue(journalRow),
    create: jest.fn().mockImplementation(({ data, include }) => {
      const created = {
        ...journalRow,
        id: 'journal-new',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        lines: journalRow.lines,
      };
      return Promise.resolve(include ? created : created);
    }),
    update: jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({
        ...journalRow,
        ...data,
        status: data.status ?? journalRow.status,
      }),
    ),
    delete: jest.fn().mockResolvedValue(journalRow),
  };
}

describe('Modules pôles & comptabilité (e2e)', () => {
  let ctx: PoleExpansionE2eContext;
  let app: INestApplication;

  beforeAll(async () => {
    const hash = await hashE2ePassword();
    const userRow = buildE2eUserRow(hash);
    const prismaMock = createAuthPrismaMock(userRow);
    attachPoleModuleMocks(prismaMock);
    ctx = await createPoleExpansionE2eApp(prismaMock);
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  async function loginAgent() {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);
    return agent;
  }

  describe('Stratégie', () => {
    it('GET /strategy/projects → 401 sans session', async () => {
      await request(app.getHttpServer()).get('/strategy/projects').expect(401);
    });

    it('GET /strategy/projects → 200 pour ADMIN', async () => {
      const agent = await loginAgent();
      const res = await agent.get('/strategy/projects').expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Expansion filiales');
    });

    it('POST /strategy/projects → 201 pour ADMIN', async () => {
      const agent = await loginAgent();
      const res = await agent
        .post('/strategy/projects')
        .send({
          organizationId: ORG_ID,
          title: 'Nouveau projet',
        })
        .expect(201);
      expect(res.body.title).toBe('Nouveau projet');
    });
  });

  describe('Marketing', () => {
    it('GET /marketing/campaigns → 401 sans session', async () => {
      await request(app.getHttpServer()).get('/marketing/campaigns').expect(401);
    });

    it('GET /marketing/campaigns → 200 pour ADMIN', async () => {
      const agent = await loginAgent();
      const res = await agent.get('/marketing/campaigns').expect(200);
      expect(res.body[0].channel).toBe('Réseaux sociaux');
    });
  });

  describe('Spirituel', () => {
    it('GET /spiritual/events → 200 pour ADMIN', async () => {
      const agent = await loginAgent();
      const res = await agent.get('/spiritual/events').expect(200);
      expect(res.body[0].location).toBe('Temple central');
    });
  });

  describe('Comptabilité', () => {
    it('GET /accounting/chart-accounts → 401 sans session', async () => {
      await request(app.getHttpServer()).get('/accounting/chart-accounts').expect(401);
    });

    it('GET /accounting/chart-accounts → 200 pour ADMIN', async () => {
      const agent = await loginAgent();
      const res = await agent.get('/accounting/chart-accounts').expect(200);
      expect(res.body[0].code).toBe('601');
    });

    it('POST /accounting/chart-accounts → 201 pour ADMIN', async () => {
      const agent = await loginAgent();
      const res = await agent
        .post('/accounting/chart-accounts')
        .send({
          organizationId: ORG_ID,
          code: '512',
          name: 'Banque',
          accountType: 'ASSET',
        })
        .expect(201);
      expect(res.body.code).toBe('512');
    });

    it('GET /accounting/journal-entries → 200 pour ADMIN', async () => {
      const agent = await loginAgent();
      const res = await agent.get('/accounting/journal-entries').expect(200);
      expect(res.body[0].reference).toBe('JE-001');
    });

    it('POST /accounting/journal-entries/:id/post → 200 pour ADMIN', async () => {
      const agent = await loginAgent();
      const res = await agent
        .post('/accounting/journal-entries/journal-1/post')
        .expect(201);
      expect(res.body.status).toBe('POSTED');
    });
  });
});
