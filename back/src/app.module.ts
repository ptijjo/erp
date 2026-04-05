import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RedisModule } from './redis/redis.module';
import { SeederModule } from './seeder/seeder.module';
import { RoleModule } from './role/role.module';
import { OrganisationModule } from './organisation/organisation.module';
import { CaslModule } from './casl/casl.module';
import { AuditModule } from './audit/audit.module';
import { PermissionModule } from './permission/permission.module';
import { LoginAttemptModule } from './login-attempt/login-attempt.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { StockModule } from './stock/stock.module';
import { VenteModule } from './vente/vente.module';
import { SessionCaisseModule } from './session-caisse/session-caisse.module';
import { ContratModule } from './contrat/contrat.module';
import { PlanningShiftModule } from './planning-shift/planning-shift.module';
import { PointageModule } from './pointage/pointage.module';
import { AbsenceModule } from './absence/absence.module';
import { BulletinPaieModule } from './bulletin-paie/bulletin-paie.module';

@Module({
  imports: [
    AbsenceModule,
    AuditModule,
    AuthModule,
    BulletinPaieModule,
    CaslModule,
    CategoryModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ContratModule,
    HealthModule,
    LoginAttemptModule,
    OrganisationModule,
    PermissionModule,
    PlanningShiftModule,
    PointageModule,
    PrismaModule,
    ProductModule,
    RedisModule,
    RoleModule,
    SeederModule,
    SessionCaisseModule,
    StockModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const limit =
          parseInt(config.get<string>('THROTTLE_LIMIT') ?? '120', 10) || 120;
        const ttl =
          parseInt(config.get<string>('THROTTLE_TTL_MS') ?? '60000', 10) ||
          60_000;
        return {
          throttlers: [{ ttl, limit }],
        };
      },
    }),
    UserModule,
    VenteModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
