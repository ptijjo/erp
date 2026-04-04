import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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
  ) {
    return this.auditLogService.findByEntity(entityType, entityId);
  }

  @Get('user/:userId')
  @CheckPolicies({ action: 'read', subject: 'AuditLog' })
  findByUser(@Param('userId') userId: string) {
    return this.auditLogService.findByUserId(userId);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'AuditLog' })
  findOne(@Param('id') id: string) {
    return this.auditLogService.findOne(id);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'AuditLog' })
  findAll(@Query('take') take?: string) {
    const n = take ? parseInt(take, 10) : 200;
    return this.auditLogService.findAll(Number.isFinite(n) ? n : 200);
  }
}
