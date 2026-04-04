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
import type { Prisma } from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { CreatePointageDto, UpdatePointageDto } from './dto/pointage.dto';
import { PointageService } from './pointage.service';

@Controller('pointage')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class PointageController {
  constructor(private readonly pointageService: PointageService) {}

  @Get('user/:userId')
  @CheckPolicies({ action: 'read', subject: 'Pointage' })
  findByUser(
    @Param('userId') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromD = from ? new Date(from) : undefined;
    const toD = to ? new Date(to) : undefined;
    return this.pointageService.findByUserId(userId, fromD, toD);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Pointage' })
  findAll() {
    return this.pointageService.findAll();
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Pointage' })
  findOne(@Param('id') id: string) {
    return this.pointageService.findOne(id);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Pointage' })
  create(@Body() dto: CreatePointageDto) {
    const data: Prisma.PointageCreateInput = {
      entreeAt: new Date(dto.entreeAt),
      user: { connect: { id: dto.userId } },
      organization: { connect: { id: dto.organizationId } },
      ...(dto.sortieAt !== undefined
        ? { sortieAt: dto.sortieAt ? new Date(dto.sortieAt) : null }
        : {}),
      ...(dto.statut !== undefined ? { statut: dto.statut } : {}),
      ...(dto.planningShiftId
        ? { planningShift: { connect: { id: dto.planningShiftId } } }
        : {}),
      ...(dto.validatedByUserId
        ? { validatedByUser: { connect: { id: dto.validatedByUserId } } }
        : {}),
    };
    return this.pointageService.create(data);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Pointage' })
  update(@Param('id') id: string, @Body() dto: UpdatePointageDto) {
    const data: Prisma.PointageUpdateInput = {
      ...(dto.entreeAt !== undefined ? { entreeAt: new Date(dto.entreeAt) } : {}),
      ...(dto.sortieAt !== undefined
        ? { sortieAt: dto.sortieAt ? new Date(dto.sortieAt) : null }
        : {}),
      ...(dto.statut !== undefined ? { statut: dto.statut } : {}),
      ...(dto.validatedAt !== undefined
        ? { validatedAt: dto.validatedAt ? new Date(dto.validatedAt) : null }
        : {}),
    };
    if (dto.planningShiftId !== undefined) {
      data.planningShift =
        dto.planningShiftId === null
          ? { disconnect: true }
          : { connect: { id: dto.planningShiftId } };
    }
    if (dto.validatedByUserId !== undefined) {
      data.validatedByUser =
        dto.validatedByUserId === null
          ? { disconnect: true }
          : { connect: { id: dto.validatedByUserId } };
    }
    return this.pointageService.update(id, data);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Pointage' })
  remove(@Param('id') id: string) {
    return this.pointageService.remove(id);
  }
}
