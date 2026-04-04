import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { CreateAbsenceDto, UpdateAbsenceDto } from './dto/absence.dto';
import { AbsenceService } from './absence.service';

@Controller('absence')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AbsenceController {
  constructor(private readonly absenceService: AbsenceService) {}

  @Get('user/:userId')
  @CheckPolicies({ action: 'read', subject: 'Absence' })
  findByUser(@Param('userId') userId: string) {
    return this.absenceService.findByUserId(userId);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Absence' })
  findAll() {
    return this.absenceService.findAll();
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Absence' })
  findOne(@Param('id') id: string) {
    return this.absenceService.findOne(id);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Absence' })
  create(@Body() dto: CreateAbsenceDto) {
    const data: Prisma.AbsenceCreateInput = {
      type: dto.type,
      debut: new Date(dto.debut),
      fin: new Date(dto.fin),
      user: { connect: { id: dto.userId } },
      organization: { connect: { id: dto.organizationId } },
      ...(dto.statut !== undefined ? { statut: dto.statut } : {}),
      ...(dto.commentaire !== undefined ? { commentaire: dto.commentaire } : {}),
    };
    return this.absenceService.create(data);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Absence' })
  update(@Param('id') id: string, @Body() dto: UpdateAbsenceDto) {
    const data: Prisma.AbsenceUpdateInput = {
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.debut !== undefined ? { debut: new Date(dto.debut) } : {}),
      ...(dto.fin !== undefined ? { fin: new Date(dto.fin) } : {}),
      ...(dto.statut !== undefined ? { statut: dto.statut } : {}),
      ...(dto.commentaire !== undefined ? { commentaire: dto.commentaire } : {}),
    };
    return this.absenceService.update(id, data);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Absence' })
  remove(@Param('id') id: string) {
    return this.absenceService.remove(id);
  }
}
