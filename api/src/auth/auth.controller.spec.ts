import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthSessionSettings } from './auth-session-settings.service';
import { LocalAuthGuard } from './local.strategy/local-auth.guard';
import { JwtAuthGuard } from './jwt.strategy/jwt-auth.guard';
import { allowAllGuard } from '../test/mocks/guards.mock';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            issueSession: jest.fn(),
            logout: jest.fn(),
            refreshSession: jest.fn(),
            resolveAuthenticatedUser: jest.fn(),
            setFirstPassword: jest.fn(),
            buildMeResponse: jest.fn(),
          },
        },
        {
          provide: AuthSessionSettings,
          useValue: {
            accessCookieName: 'token',
            refreshCookieName: 'refresh_token',
            refreshRedisKey: (t: string) => `refresh:${t}`,
          },
        },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
