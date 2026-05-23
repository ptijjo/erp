import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import {
  buildE2eHrDirectorUserRow,
  buildE2eSubsidiaryUserRow,
  buildE2eUserRow,
  E2E_HR_DIRECTOR_EMAIL,
  E2E_HR_DIRECTOR_ROLE_ID,
  E2E_SUBSIDIARY_EMAIL,
  E2E_SUBSIDIARY_ORG_ID,
  E2E_SUBSIDIARY_ROLE_ID,
  E2E_TEST_EMAIL,
  E2E_TEST_PASSWORD,
  hashE2ePassword,
} from './helpers/auth-e2e.fixtures';
import { createAuthPrismaMock } from './helpers/auth-prisma.mock';
import { createAuthE2eApp, type E2eAppContext } from './helpers/create-e2e-app';
import { EmployeeStatus } from '../src/generated/prisma/client';

const E2E_MAIN_ORG_ID = 'e2e-org-id';

/** UUID v4 valide pour la validation DTO (`@IsUUID('4')`). */
const E2E_SUBSIDIARY_ORG_UUID = '11111111-1111-4111-8111-111111111111';

const hrDirectorPermissions = [
  { permission: { name: 'read:all' } },
  { permission: { name: 'read:Department' } },
  { permission: { name: 'create:Department' } },
  { permission: { name: 'read:Employee' } },
  { permission: { name: 'create:Employee' } },
];

describe('HR (e2e)', () => {
  let ctx: E2eAppContext;
  let app: INestApplication;

  const departmentsFixture = [
    {
      id: 'e2e-dep-rh',
      name: 'Ressources humaines',
      organizationId: E2E_MAIN_ORG_ID,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    },
  ];

  const createdDepartment = {
    id: 'e2e-dep-new',
    name: 'Opérations',
    organizationId: E2E_SUBSIDIARY_ORG_UUID,
    createdAt: new Date('2026-05-20T00:00:00.000Z'),
    updatedAt: new Date('2026-05-20T00:00:00.000Z'),
  };

  const employeesFixture = [
    {
      id: 'e2e-emp-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@filiale.local',
      phone: null,
      position: 'Ingénieure',
      status: EmployeeStatus.ACTIVE,
      hireDate: new Date('2024-03-01T00:00:00.000Z'),
      terminationDate: null,
      organizationId: E2E_SUBSIDIARY_ORG_ID,
      departmentId: null,
      managerId: null,
      userId: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      department: null,
      manager: null,
      user: null,
    },
  ];

  beforeAll(async () => {
    const hash = await hashE2ePassword();
    const adminUser = buildE2eUserRow(hash);
    const prismaMock = createAuthPrismaMock(adminUser);

    prismaMock.department = {
      findMany: jest.fn().mockResolvedValue(departmentsFixture),
      count: jest.fn().mockResolvedValue(departmentsFixture.length),
      findUnique: jest.fn().mockImplementation(
        async (args: { where: { id: string } }) =>
          departmentsFixture.find((d) => d.id === args.where.id) ?? null,
      ),
      create: jest.fn().mockResolvedValue(createdDepartment),
      update: jest.fn(),
      delete: jest.fn(),
    };

    prismaMock.employee = {
      findMany: jest.fn().mockResolvedValue(employeesFixture),
      count: jest.fn().mockResolvedValue(employeesFixture.length),
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue(employeesFixture[0]),
      update: jest.fn(),
      delete: jest.fn(),
    };

    prismaMock.leaveRequest = { findMany: jest.fn().mockResolvedValue([]) };
    prismaMock.leaveBalance = { findMany: jest.fn().mockResolvedValue([]) };
    prismaMock.employmentContract = { findMany: jest.fn().mockResolvedValue([]) };
    prismaMock.employeeSalary = { findMany: jest.fn().mockResolvedValue([]) };

    ctx = await createAuthE2eApp(prismaMock);
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /hr/departments retourne 401 sans session', async () => {
    await request(app.getHttpServer()).get('/hr/departments').expect(401);
  });

  it('GET /hr/departments retourne 200 pour un ADMIN authentifié', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent.get('/hr/departments?page=1&limit=20').expect(200);
    expect(res.body.items).toEqual([
      {
        ...departmentsFixture[0],
        createdAt: departmentsFixture[0].createdAt.toISOString(),
        updatedAt: departmentsFixture[0].updatedAt.toISOString(),
      },
    ]);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('GET /hr/employees retourne 200 pour un ADMIN authentifié', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent.get('/hr/employees').expect(200);
    expect(res.body.items[0]).toMatchObject({
      id: 'e2e-emp-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(res.body.items[0].hireDate).toBe(
      employeesFixture[0].hireDate.toISOString(),
    );
  });

  it('rejette limit > 20', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    await agent.get('/hr/departments?limit=50').expect(400);
  });

  it('POST /hr/departments crée un département (maison mère)', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent
      .post('/hr/departments')
      .send({
        name: 'Opérations',
        organizationId: E2E_SUBSIDIARY_ORG_UUID,
      })
      .expect(201);

    expect(res.body).toMatchObject({
      id: 'e2e-dep-new',
      name: 'Opérations',
      organizationId: E2E_SUBSIDIARY_ORG_UUID,
    });
    expect(ctx.prisma.department?.create).toHaveBeenCalled();
  });
});

describe('HR permissions (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it('GET /hr/departments retourne 403 sans permission RH (filiale)', async () => {
    const hash = await hashE2ePassword();
    const subsidiaryUser = buildE2eSubsidiaryUserRow(hash);
    const prismaMock = createAuthPrismaMock(subsidiaryUser, {
      permissionRolesByRoleId: {
        [E2E_SUBSIDIARY_ROLE_ID]: [{ permission: { name: 'read:Stock' } }],
      },
    });
    prismaMock.department = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };

    const ctx = await createAuthE2eApp(prismaMock);
    app = ctx.app;

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_SUBSIDIARY_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    await agent.get('/hr/departments').expect(403);
  });

  it('GET /hr/departments retourne 200 pour DIRECTOR_HR (read:all)', async () => {
    const hash = await hashE2ePassword();
    const hrUser = buildE2eHrDirectorUserRow(hash);
    const prismaMock = createAuthPrismaMock(hrUser, {
      permissionRolesByRoleId: {
        [E2E_HR_DIRECTOR_ROLE_ID]: hrDirectorPermissions,
      },
    });
    prismaMock.department = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'dep-hq',
          name: 'RH siège',
          organizationId: E2E_MAIN_ORG_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      count: jest.fn().mockResolvedValue(1),
    };

    const ctx = await createAuthE2eApp(prismaMock);
    app = ctx.app;

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/login')
      .send({ email: E2E_HR_DIRECTOR_EMAIL, password: E2E_TEST_PASSWORD })
      .expect(200);

    const res = await agent.get('/hr/departments').expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].name).toBe('RH siège');
  });
});
