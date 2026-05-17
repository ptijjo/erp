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
import { PoleModule } from '../../src/pole/pole.module';
import { BudgetModule } from '../../src/budget/budget.module';
import { StockOrderModule } from '../../src/stock-order/stock-order.module';
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

export type E2eAppContext = {
  app: INestApplication;
  module: TestingModule;
  redis: InMemoryRedisService;
  prisma: AuthPrismaMock;
};

export async function createAuthE2eApp(
  prismaMock: AuthPrismaMock,
): Promise<E2eAppContext> {
  const redis = new InMemoryRedisService();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [e2eConfig] }),
      CaslModule,
      AuthModule,
      PoleModule,
      BudgetModule,
      StockOrderModule,
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
    }),
  );
  await app.init();

  return { app, module: moduleFixture, redis, prisma: prismaMock };
}
