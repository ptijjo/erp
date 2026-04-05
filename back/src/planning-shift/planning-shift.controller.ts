import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import type { Prisma } from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import {
  CreatePlanningShiftDto,
  UpdatePlanningShiftDto,
} from './dto/planning-shift.dto';
import { PlanningShiftService } from './planning-shift.service';

@Controller('planning-shift')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class PlanningShiftController {
  constructor(private readonly planningShiftService: PlanningShiftService) {}

  @Get('organization/:organizationId')
  @CheckPolicies({ action: 'read', subject: 'PlanningShift' })
  findByOrganization(
    @Param('organizationId') organizationId: string,
    @CurrentUser() viewer: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromD = from ? new Date(from) : undefined;
    const toD = to ? new Date(to) : undefined;
    return this.planningShiftService.findByOrganizationId(
      organizationId,
      viewer,
      fromD,
      toD,
    );
  }

  @Get('user/:userId')
  @CheckPolicies({ action: 'read', subject: 'PlanningShift' })
  findByUser(
    @Param('userId') userId: string,
    @CurrentUser() viewer: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromD = from ? new Date(from) : undefined;
    const toD = to ? new Date(to) : undefined;
    return this.planningShiftService.findByUserId(
      userId,
      viewer,
      fromD,
      toD,
    );
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'PlanningShift' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.planningShiftService.findAll(viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'PlanningShift' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.planningShiftService.findOne(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'PlanningShift' })
  create(
    @Body() dto: CreatePlanningShiftDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    const data: Prisma.PlanningShiftCreateInput = {
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      user: { connect: { id: dto.userId } },
      organization: { connect: { id: dto.organizationId } },
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.note !== undefined ? { note: dto.note } : {}),
    };
    return this.planningShiftService.create(data, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'PlanningShift' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlanningShiftDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    const data: Prisma.PlanningShiftUpdateInput = {
      ...(dto.startsAt !== undefined ? { startsAt: new Date(dto.startsAt) } : {}),
      ...(dto.endsAt !== undefined ? { endsAt: new Date(dto.endsAt) } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.note !== undefined ? { note: dto.note } : {}),
    };
    return this.planningShiftService.update(id, data, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'PlanningShift' })
  remove(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.planningShiftService.remove(id, viewer);
  }
}
