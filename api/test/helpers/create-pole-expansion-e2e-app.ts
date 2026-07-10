import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AuthModule } from '../../src/auth/auth.module';
import { CaslModule } from '../../src/casl/casl.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/redis/redis.service';
import { UserModule } from '../../src/user/user.module';
import { UserModuleAuthE2e } from './user-module-auth-e2e';
import { StrategyModule } from '../../src/strategy/strategy.module';
import { MarketingModule } from '../../src/marketing/marketing.module';
import { SpiritualModule } from '../../src/spiritual/spiritual.module';
import { AccountingModule } from '../../src/accounting/accounting.module';
import { CacheModule } from '../../src/cache/cache.module';
import { InMemoryRedisService } from './in-memory-redis.service';
import type { AuthPrismaMock } from './auth-prisma.mock';

const e2eConfig = () => ({
  JWT_SECRET: 'e2e-jwt-secret',
  JWT_ACCESS_COOKIE_NAME: 'token',
  REFRESH_TOKEN_COOKIE_NAME: 'refresh_token',
  REFRESH_SESSION_REDIS_PREFIX: 'refresh:',
  JWT_ACCESS_EXPIRES_SECONDS: '900',
  REFRESH_TOKEN_TTL_SECONDS: '3600',
  PASSWORD_ROUNDS: '4',
  NODE_ENV: 'test',
});

export type PoleExpansionE2eContext = {
  app: INestApplication;
  module: TestingModule;
  redis: InMemoryRedisService;
  prisma: AuthPrismaMock;
};

/** App e2e minimale pour stratégie, marketing, spirituel et comptabilité. */
export async function createPoleExpansionE2eApp(
  prismaMock: AuthPrismaMock,
): Promise<PoleExpansionE2eContext> {
  const redis = new InMemoryRedisService();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [e2eConfig] }),
      CacheModule,
      CaslModule,
      AuthModule,
      StrategyModule,
      MarketingModule,
      SpiritualModule,
      AccountingModule,
    ],
  })
    .overrideModule(UserModule)
    .useModule(UserModuleAuthE2e)
    .overrideProvider(PrismaService)
    .useValue(prismaMock)
    .overrideProvider(RedisService)
    .useValue(redis)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();

  return { app, module: moduleFixture, redis, prisma: prismaMock };
}
