import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { AuditLogService } from './audit-log.service';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('entity/:entityType/:entityId')
  @CheckPolicies({ action: 'read', subject: 'AuditLog' })
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.auditLogService.findByEntity(entityType, entityId, viewer);
  }

  @Get('user/:userId')
  @CheckPolicies({ action: 'read', subject: 'AuditLog' })
  findByUser(
    @Param('userId') userId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.auditLogService.findByUserId(userId, 200, viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'AuditLog' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.auditLogService.findOne(id, viewer);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'AuditLog' })
  findAll(
    @Query('take') take: string | undefined,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    const n = take ? parseInt(take, 10) : 200;
    return this.auditLogService.findAll(Number.isFinite(n) ? n : 200, viewer);
  }
}
