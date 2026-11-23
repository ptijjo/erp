jest.mock('../user/user.service', () => ({
  UserService: class UserService {
    static sessionInclude = {};
    findUserByIdWithRoleAndOrg = jest.fn();
  },
}));

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { passwordMatches } from './auth-password';
import { UserService } from '../user/user.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthSessionSettings } from './auth-session-settings.service';
import { mockAppCacheServiceProvider } from '../test/mocks/app-cache.mock';

jest.mock('./auth-password', () => ({
  passwordMatches: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: { sign: jest.Mock };
  let userService: {
    findUser: jest.Mock;
    findUserByIdWithRoleAndOrg: jest.Mock;
  };
  let redis: {
    exists: jest.Mock;
    del: jest.Mock;
    incr: jest.Mock;
    expire: jest.Mock;
    setEx: jest.Mock;
    getDel: jest.Mock;
    get: jest.Mock;
    sAdd: jest.Mock;
    sRem: jest.Mock;
    sMembers: jest.Mock;
  };
  let setExArgs: Array<[string, number, string]>;
  let loginAttemptCreate: jest.Mock;

  const loginCtx = { ip: '203.0.113.8', userAgent: 'jest' };

  const sessionUser = {
    id: 'user-1',
    email: 'a@test.local',
    password: 'hash',
    firstLogin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    organizationId: 'org-1',
    roleId: 'role-1',
    role: {
      id: 'role-1',
      name: 'ADMIN',
      description: null,
      pole: null,
    },
    organization: {
      id: 'org-1',
      name: 'VIFAA',
      slug: 'vifaa',
      organizationType: 'MAIN' as const,
    },
  };

  beforeEach(async () => {
    jwtService = { sign: jest.fn().mockReturnValue('access-jwt') };
    userService = {
      findUser: jest.fn(),
      findUserByIdWithRoleAndOrg: jest.fn(),
    };
    redis = {
      exists: jest.fn().mockResolvedValue(false),
      del: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      setEx: jest.fn(),
      getDel: jest.fn(),
      get: jest.fn(),
      sAdd: jest.fn(),
      sRem: jest.fn(),
      sMembers: jest.fn(),
    };
    loginAttemptCreate = jest.fn();
    setExArgs = [];
    redis.setEx.mockImplementation(
      (key: string, ttl: number, value: string) => {
        setExArgs.push([key, ttl, value]);
        return Promise.resolve();
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redis },
        {
          provide: PrismaService,
          useValue: {
            loginAttempt: { create: loginAttemptCreate },
            user: { findUnique: jest.fn(), update: jest.fn() },
            permissionRole: { findMany: jest.fn().mockResolvedValue([]) },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_ACCESS_EXPIRES_SECONDS') return '900';
              if (key === 'REFRESH_TOKEN_TTL_SECONDS') return '3600';
              return undefined;
            }),
          },
        },
        {
          provide: AuthSessionSettings,
          useValue: {
            refreshRedisKey: (t: string) => `refresh:${t}`,
          },
        },
        mockAppCacheServiceProvider,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('issueSession', () => {
    it('signe un JWT ne contenant que sub', async () => {
      const { password: _p, ...safe } = sessionUser;
      const tokens = await service.issueSession({
        ...safe,
        role: {
          id: safe.role.id,
          name: safe.role.name,
          description: safe.role.description,
          pole: null,
        },
      });

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1' },
        expect.objectContaining({ expiresIn: 900 }),
      );
      expect(tokens.access_token).toBe('access-jwt');
      expect(tokens.refresh_token).toMatch(/^[a-f0-9]{96}$/);
      const stored = setExArgs.find((call) => call[0].startsWith('refresh:'));
      expect(stored?.[2]).toMatch(/^user-1\|[a-f0-9]{32}$/);
      const familyId = String(stored?.[2]).split('|')[1];
      expect(redis.sAdd).toHaveBeenCalledWith(
        `refresh-family:${familyId}`,
        tokens.refresh_token,
      );
      expect(redis.expire).toHaveBeenCalledWith(
        `refresh-family:${familyId}`,
        3600,
      );
    });
  });

  describe('validateLogin', () => {
    it('vérifie le mot de passe même si l’email est inconnu', async () => {
      userService.findUser.mockResolvedValue(null);
      (passwordMatches as jest.Mock).mockResolvedValue(false);

      const result = await service.validateLogin(
        'absent@test.local',
        'secret',
        loginCtx,
      );

      expect(result).toBeNull();
      expect(passwordMatches).toHaveBeenCalledWith('secret', undefined);
      expect(loginAttemptCreate).toHaveBeenCalledWith({
        data: {
          ipAddress: loginCtx.ip,
          userAgent: loginCtx.userAgent,
          userId: null,
          success: false,
        },
      });
    });

    it('ouvre la session quand le mot de passe stocké correspond', async () => {
      userService.findUser.mockResolvedValue(sessionUser);
      (passwordMatches as jest.Mock).mockResolvedValue(true);

      const result = await service.validateLogin(
        'a@test.local',
        'secret',
        loginCtx,
      );

      expect(passwordMatches).toHaveBeenCalledWith('secret', 'hash');
      expect(result?.id).toBe('user-1');
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('refreshWithRotation', () => {
    it('réémet un jeton dans la même famille', async () => {
      redis.getDel.mockResolvedValue('user-1|fam-1');
      userService.findUserByIdWithRoleAndOrg.mockResolvedValue(sessionUser);

      const tokens = await service.refreshWithRotation('old-token');

      expect(userService.findUserByIdWithRoleAndOrg).toHaveBeenCalledWith(
        'user-1',
      );
      expect(redis.setEx).toHaveBeenCalledWith(
        'refresh-tomb:old-token',
        3600,
        'fam-1',
      );
      expect(redis.sRem).toHaveBeenCalledWith(
        'refresh-family:fam-1',
        'old-token',
      );
      expect(redis.setEx).toHaveBeenCalledWith(
        `refresh:${tokens.refresh_token}`,
        3600,
        'user-1|fam-1',
      );
      expect(redis.sAdd).toHaveBeenCalledWith(
        'refresh-family:fam-1',
        tokens.refresh_token,
      );
    });

    it('révoque la famille si un jeton déjà consommé est représenté', async () => {
      redis.getDel.mockResolvedValue(null);
      redis.get.mockImplementation((key: string) =>
        Promise.resolve(key === 'refresh-tomb:old-token' ? 'fam-1' : null),
      );
      redis.sMembers.mockResolvedValue(['stolen-token']);

      await expect(
        service.refreshWithRotation('old-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(redis.del).toHaveBeenCalledWith('refresh:stolen-token');
      expect(redis.del).toHaveBeenCalledWith('refresh-family:fam-1');
      expect(userService.findUserByIdWithRoleAndOrg).not.toHaveBeenCalled();
    });

    it('répond 401 sans révocation si le jeton est inconnu', async () => {
      redis.getDel.mockResolvedValue(null);
      redis.get.mockResolvedValue(null);

      await expect(
        service.refreshWithRotation('missing'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(redis.sMembers).not.toHaveBeenCalled();
    });

    it('rattache un ancien jeton sans famille à une nouvelle famille révocable', async () => {
      redis.getDel.mockResolvedValue('user-1');
      userService.findUserByIdWithRoleAndOrg.mockResolvedValue(sessionUser);

      const tokens = await service.refreshWithRotation('legacy-token');

      const tomb = setExArgs.find(
        (call) => call[0] === 'refresh-tomb:legacy-token',
      );
      const familyId = tomb?.[2];
      expect(familyId).toMatch(/^[a-f0-9]{32}$/);
      expect(redis.setEx).toHaveBeenCalledWith(
        `refresh:${tokens.refresh_token}`,
        3600,
        `user-1|${familyId}`,
      );
    });
  });

  describe('resolveAuthenticatedUser', () => {
    it('recharge le profil depuis la base', async () => {
      userService.findUserByIdWithRoleAndOrg.mockResolvedValue(sessionUser);

      const user = await service.resolveAuthenticatedUser('user-1');

      expect(user.sub).toBe('user-1');
      expect(user.role.name).toBe('ADMIN');
      expect(user.role.poleCode).toBeNull();
    });

    it('rejette si utilisateur absent', async () => {
      userService.findUserByIdWithRoleAndOrg.mockResolvedValue(null);

      await expect(
        service.resolveAuthenticatedUser('missing'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
