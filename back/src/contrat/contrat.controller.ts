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
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import type { Prisma } from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { CreateContratDto, UpdateContratDto } from './dto/contrat.dto';
import { ContratService } from './contrat.service';

@Controller('contrat')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ContratController {
  constructor(private readonly contratService: ContratService) {}

  @Get('user/:userId')
  @CheckPolicies({ action: 'read', subject: 'Contrat' })
  findByUser(
    @Param('userId') userId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.contratService.findByUserId(userId, viewer);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Contrat' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.contratService.findAll(viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Contrat' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.contratService.findOne(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Contrat' })
  create(
    @Body() dto: CreateContratDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    const data: Prisma.ContratCreateInput = {
      type: dto.type,
      dateDebut: new Date(dto.dateDebut),
      user: { connect: { id: dto.userId } },
      organization: { connect: { id: dto.organizationId } },
      ...(dto.dateFin !== undefined
        ? { dateFin: dto.dateFin ? new Date(dto.dateFin) : null }
        : {}),
      ...(dto.heuresHebdomadaires !== undefined
        ? { heuresHebdomadaires: dto.heuresHebdomadaires }
        : {}),
      ...(dto.actif !== undefined ? { actif: dto.actif } : {}),
      ...(dto.commentaire !== undefined ? { commentaire: dto.commentaire } : {}),
    };
    return this.contratService.create(data, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Contrat' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContratDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    const data: Prisma.ContratUpdateInput = {
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.dateDebut !== undefined ? { dateDebut: new Date(dto.dateDebut) } : {}),
      ...(dto.dateFin !== undefined
        ? { dateFin: dto.dateFin ? new Date(dto.dateFin) : null }
        : {}),
      ...(dto.heuresHebdomadaires !== undefined
        ? { heuresHebdomadaires: dto.heuresHebdomadaires }
        : {}),
      ...(dto.actif !== undefined ? { actif: dto.actif } : {}),
      ...(dto.commentaire !== undefined ? { commentaire: dto.commentaire } : {}),
    };
    return this.contratService.update(id, data, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Contrat' })
  remove(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.contratService.remove(id, viewer);
  }
}
