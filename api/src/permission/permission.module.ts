import { Module } from '@nestjs/common';
import { AdminRoleGuard } from '../casl/admin-role.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionService } from './permission.service';
import { PermissionRoleService } from './permission-role.service';
import { PermissionController } from './permission.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionController],
  providers: [PermissionService, PermissionRoleService, AdminRoleGuard],
  exports: [PermissionService, PermissionRoleService],
})
export class PermissionModule {}
