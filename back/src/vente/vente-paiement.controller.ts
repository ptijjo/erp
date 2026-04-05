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
import {
  CreateVentePaiementDto,
  UpdateVentePaiementDto,
} from './dto/vente-paiement.dto';
import { VentePaiementService } from './vente-paiement.service';

@Controller('vente-paiement')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class VentePaiementController {
  constructor(private readonly ventePaiementService: VentePaiementService) {}

  @Get('by-vente/:venteId')
  @CheckPolicies({ action: 'read', subject: 'VentePaiement' })
  findByVente(
    @Param('venteId') venteId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.ventePaiementService.findByVenteId(venteId, viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'VentePaiement' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.ventePaiementService.findOne(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'VentePaiement' })
  create(
    @Body() dto: CreateVentePaiementDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    const data: Prisma.VentePaiementCreateInput = {
      vente: { connect: { id: dto.venteId } },
      modePaiement: dto.modePaiement,
      amount: dto.amount,
    };
    return this.ventePaiementService.create(data, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'VentePaiement' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVentePaiementDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    const data: Prisma.VentePaiementUpdateInput = {
      ...(dto.modePaiement !== undefined ? { modePaiement: dto.modePaiement } : {}),
      ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
    };
    return this.ventePaiementService.update(id, data, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'VentePaiement' })
  remove(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.ventePaiementService.remove(id, viewer);
  }
}
