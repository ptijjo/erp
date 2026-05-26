import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
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
import { StockOrderModule } from './stock-order/stock-order.module';
import { SupplierModule } from './supplier/supplier.module';
import { BudgetModule } from './budget/budget.module';
import { PoleModule } from './pole/pole.module';
import { HrModule } from './hr/hr.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { VenteModule } from './vente/vente.module';
import { SessionCaisseModule } from './session-caisse/session-caisse.module';
import { NotificationModule } from './notification/notification.module';
import { TreasuryModule } from './treasury/treasury.module';
import { MailModule } from './mail/mail.module';
import { CronModule } from './cron/cron.module';
import { RealtimeModule } from './realtime/realtime.module';
import { MessagingModule } from './messaging/messaging.module';
import { AuditContextInterceptor } from './prisma/audit-context.interceptor';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    CaslModule,
    CategoryModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    LoginAttemptModule,
    OrganisationModule,
    PermissionModule,
    PoleModule,
    PrismaModule,
    ProductModule,
    RedisModule,
    RoleModule,
    SeederModule,
    StockModule,
    StockOrderModule,
    SupplierModule,
    BudgetModule,
    HrModule,
    AnalyticsModule,
    VenteModule,
    SessionCaisseModule,
    NotificationModule,
    TreasuryModule,
    MailModule,
    CronModule,
    RealtimeModule,
    MessagingModule,
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditContextInterceptor,
    },
  ],
})
export class AppModule {}
