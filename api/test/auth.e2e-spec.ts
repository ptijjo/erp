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

describe('Auth (e2e)', () => {
  let ctx: E2eAppContext;
  let app: INestApplication;
  const accessCookie = 'token';
  const refreshCookie = 'refresh_token';

  beforeAll(async () => {
    const hash = await hashE2ePassword();
    const userRow = buildE2eUserRow(hash);
    const prismaMock = createAuthPrismaMock(userRow);
    ctx = await createAuthE2eApp(prismaMock);
    app = ctx.app;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    ctx.redis.clear();
  });

  describe('POST /auth/login', () => {
    it('rejette un mot de passe invalide avec 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: E2E_TEST_EMAIL, password: 'WrongPass1!' })
        .expect(401);
    });

    it('rejette un mot de passe trop faible (guard avant validation DTO) avec 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: E2E_TEST_EMAIL, password: 'short' })
        .expect(401);
    });

    it('émet les cookies access et refresh après connexion valide', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
        .expect(200);

      expect(res.body).toEqual({ message: 'Login successful' });
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const joined = Array.isArray(cookies) ? cookies.join(';') : String(cookies);
      expect(joined).toContain(`${accessCookie}=`);
      expect(joined).toContain(`${refreshCookie}=`);
      expect(ctx.prisma.loginAttempt.create).toHaveBeenCalled();
    });
  });

  describe('GET /auth/me', () => {
    it('retourne 401 sans cookie access', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('retourne le profil rechargé depuis la base avec un JWT valide', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent
        .post('/auth/login')
        .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
        .expect(200);

      const me = await agent.get('/auth/me').expect(200);

      expect(me.body).toMatchObject({
        email: E2E_TEST_EMAIL,
        sub: 'e2e-user-id',
        organisationId: 'e2e-org-id',
        organizationType: 'MAIN',
        role: {
          name: 'ADMIN',
          poleCode: null,
        },
        permissionMode: 'FULL_ACCESS',
      });
      expect(me.body.permissions).toContain('manage:all');
    });
  });

  describe('POST /auth/refresh', () => {
    it('renouvelle la session à partir du cookie refresh', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent
        .post('/auth/login')
        .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
        .expect(200);

      const refreshed = await agent.post('/auth/refresh').expect(200);
      expect(refreshed.body).toEqual({ message: 'Session refreshed' });

      await agent.get('/auth/me').expect(200);
    });

    it('retourne 401 sans cookie refresh', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('révoque la session et supprime les cookies', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent
        .post('/auth/login')
        .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
        .expect(200);

      const logout = await agent.post('/auth/logout').expect(200);
      expect(logout.body).toEqual({ message: 'Logged out successfully' });

      await agent.get('/auth/me').expect(401);

      await agent.post('/auth/refresh').expect(401);
    });
  });

  describe('JWT minimal (sub uniquement)', () => {
    it('le cookie access ne contient pas le rôle en clair dans le payload', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD })
        .expect(200);

      const cookies = login.headers['set-cookie'];
      const accessLine = (Array.isArray(cookies) ? cookies : [String(cookies)]).find(
        (c) => c.startsWith(`${accessCookie}=`),
      );
      expect(accessLine).toBeDefined();
      const token = accessLine!.split(';')[0].slice(`${accessCookie}=`.length);
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
      ) as { sub: string; role?: unknown; email?: string };
      expect(payload.sub).toBe('e2e-user-id');
      expect(payload.role).toBeUndefined();
      expect(payload.email).toBeUndefined();
    });
  });
});
