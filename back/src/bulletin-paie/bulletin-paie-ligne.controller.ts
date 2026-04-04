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
import {
  CreateBulletinPaieLigneDto,
  UpdateBulletinPaieLigneDto,
} from './dto/bulletin-paie-ligne.dto';
import { BulletinPaieLigneService } from './bulletin-paie-ligne.service';

@Controller('bulletin-paie-ligne')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class BulletinPaieLigneController {
  constructor(
    private readonly bulletinPaieLigneService: BulletinPaieLigneService,
  ) {}

  @Get('by-bulletin/:bulletinId')
  @CheckPolicies({ action: 'read', subject: 'BulletinPaieLigne' })
  findByBulletin(@Param('bulletinId') bulletinId: string) {
    return this.bulletinPaieLigneService.findByBulletinId(bulletinId);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'BulletinPaieLigne' })
  findOne(@Param('id') id: string) {
    return this.bulletinPaieLigneService.findOne(id);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'BulletinPaieLigne' })
  create(@Body() dto: CreateBulletinPaieLigneDto) {
    const data: Prisma.BulletinPaieLigneCreateInput = {
      bulletin: { connect: { id: dto.bulletinId } },
      code: dto.code,
      libelle: dto.libelle,
      montant: dto.montant,
      sens: dto.sens,
      ...(dto.ordre !== undefined ? { ordre: dto.ordre } : {}),
    };
    return this.bulletinPaieLigneService.create(data);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'BulletinPaieLigne' })
  update(@Param('id') id: string, @Body() dto: UpdateBulletinPaieLigneDto) {
    const data: Prisma.BulletinPaieLigneUpdateInput = {
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.libelle !== undefined ? { libelle: dto.libelle } : {}),
      ...(dto.montant !== undefined ? { montant: dto.montant } : {}),
      ...(dto.sens !== undefined ? { sens: dto.sens } : {}),
      ...(dto.ordre !== undefined ? { ordre: dto.ordre } : {}),
    };
    return this.bulletinPaieLigneService.update(id, data);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'BulletinPaieLigne' })
  remove(@Param('id') id: string) {
    return this.bulletinPaieLigneService.remove(id);
  }
}
