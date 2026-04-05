import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CaslAbilityFactory } from './casl-ability.factory';
import { FullAccessRoleGuard } from './full-access-role.guard';
import { PoliciesGuard } from './policies.guard';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [CaslAbilityFactory, PoliciesGuard, FullAccessRoleGuard],
  exports: [CaslAbilityFactory, PoliciesGuard, FullAccessRoleGuard],
})
export class CaslModule {}
