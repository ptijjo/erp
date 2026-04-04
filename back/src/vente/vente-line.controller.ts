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
import { CreateVenteLineDto, UpdateVenteLineDto } from './dto/vente-line.dto';
import { VenteLineService } from './vente-line.service';

@Controller('vente-line')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class VenteLineController {
  constructor(private readonly venteLineService: VenteLineService) {}

  @Get('by-vente/:venteId')
  @CheckPolicies({ action: 'read', subject: 'VenteLine' })
  findByVente(@Param('venteId') venteId: string) {
    return this.venteLineService.findByVenteId(venteId);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'VenteLine' })
  findOne(@Param('id') id: string) {
    return this.venteLineService.findOne(id);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'VenteLine' })
  create(@Body() dto: CreateVenteLineDto) {
    const data: Prisma.VenteLineCreateInput = {
      vente: { connect: { id: dto.venteId } },
      product: { connect: { id: dto.productId } },
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
    };
    return this.venteLineService.create(data);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'VenteLine' })
  update(@Param('id') id: string, @Body() dto: UpdateVenteLineDto) {
    const data: Prisma.VenteLineUpdateInput = {
      ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
      ...(dto.unitPrice !== undefined ? { unitPrice: dto.unitPrice } : {}),
    };
    return this.venteLineService.update(id, data);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'VenteLine' })
  remove(@Param('id') id: string) {
    return this.venteLineService.remove(id);
  }
}
