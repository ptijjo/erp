import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { Prisma } from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import {
  CreateBulletinPaieDto,
  UpdateBulletinPaieDto,
} from './dto/bulletin-paie.dto';
import { BulletinPaieService } from './bulletin-paie.service';

@Controller('bulletin-paie')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class BulletinPaieController {
  constructor(private readonly bulletinPaieService: BulletinPaieService) {}

  @Get('periode/:organizationId/:annee/:mois')
  @CheckPolicies({ action: 'read', subject: 'BulletinPaie' })
  findByPeriode(
    @Param('organizationId') organizationId: string,
    @Param('annee', ParseIntPipe) annee: number,
    @Param('mois', ParseIntPipe) mois: number,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.bulletinPaieService.findByPeriode(
      organizationId,
      annee,
      mois,
      viewer,
    );
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'BulletinPaie' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.bulletinPaieService.findAll(viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'BulletinPaie' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.bulletinPaieService.findOne(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'BulletinPaie' })
  create(
    @Body() dto: CreateBulletinPaieDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    const data: Prisma.BulletinPaieCreateInput = {
      annee: dto.annee,
      mois: dto.mois,
      user: { connect: { id: dto.userId } },
      organization: { connect: { id: dto.organizationId } },
      ...(dto.statut !== undefined ? { statut: dto.statut } : {}),
      ...(dto.brutTotal !== undefined ? { brutTotal: dto.brutTotal } : {}),
      ...(dto.netAPayer !== undefined ? { netAPayer: dto.netAPayer } : {}),
      ...(dto.chargesPatronales !== undefined
        ? { chargesPatronales: dto.chargesPatronales }
        : {}),
      ...(dto.chargesSalariales !== undefined
        ? { chargesSalariales: dto.chargesSalariales }
        : {}),
      ...(dto.donneesBrutes !== undefined ? { donneesBrutes: dto.donneesBrutes } : {}),
      ...(dto.generatedAt !== undefined
        ? { generatedAt: dto.generatedAt ? new Date(dto.generatedAt) : null }
        : {}),
    };
    return this.bulletinPaieService.create(data, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'BulletinPaie' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBulletinPaieDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    const data: Prisma.BulletinPaieUpdateInput = {
      ...(dto.statut !== undefined ? { statut: dto.statut } : {}),
      ...(dto.brutTotal !== undefined ? { brutTotal: dto.brutTotal } : {}),
      ...(dto.netAPayer !== undefined ? { netAPayer: dto.netAPayer } : {}),
      ...(dto.chargesPatronales !== undefined
        ? { chargesPatronales: dto.chargesPatronales }
        : {}),
      ...(dto.chargesSalariales !== undefined
        ? { chargesSalariales: dto.chargesSalariales }
        : {}),
      ...(dto.donneesBrutes !== undefined
        ? {
            donneesBrutes:
              dto.donneesBrutes === null
                ? Prisma.JsonNull
                : dto.donneesBrutes,
          }
        : {}),
      ...(dto.generatedAt !== undefined
        ? { generatedAt: dto.generatedAt ? new Date(dto.generatedAt) : null }
        : {}),
    };
    return this.bulletinPaieService.update(id, data, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'BulletinPaie' })
  remove(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.bulletinPaieService.remove(id, viewer);
  }
}
