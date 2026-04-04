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
  ) {
    return this.bulletinPaieService.findByPeriode(organizationId, annee, mois);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'BulletinPaie' })
  findAll() {
    return this.bulletinPaieService.findAll();
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'BulletinPaie' })
  findOne(@Param('id') id: string) {
    return this.bulletinPaieService.findOne(id);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'BulletinPaie' })
  create(@Body() dto: CreateBulletinPaieDto) {
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
    return this.bulletinPaieService.create(data);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'BulletinPaie' })
  update(@Param('id') id: string, @Body() dto: UpdateBulletinPaieDto) {
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
    return this.bulletinPaieService.update(id, data);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'BulletinPaie' })
  remove(@Param('id') id: string) {
    return this.bulletinPaieService.remove(id);
  }
}
