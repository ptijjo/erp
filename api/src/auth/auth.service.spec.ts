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
import { UserService } from '../user/user.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthSessionSettings } from './auth-session-settings.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: { sign: jest.Mock };
  let userService: {
    findUserByIdWithRoleAndOrg: jest.Mock;
  };

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
      findUserByIdWithRoleAndOrg: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: RedisService,
          useValue: {
            exists: jest.fn(),
            del: jest.fn(),
            incr: jest.fn(),
            expire: jest.fn(),
            setEx: jest.fn(),
            getDel: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            loginAttempt: { create: jest.fn() },
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
