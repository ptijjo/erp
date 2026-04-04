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
import { CreateVenteDto, UpdateVenteDto } from './dto/vente.dto';
import { VenteService } from './vente.service';

@Controller('vente')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class VenteController {
  constructor(private readonly venteService: VenteService) {}

  @Get('organization/:organizationId')
  @CheckPolicies({ action: 'read', subject: 'Vente' })
  findByOrganization(@Param('organizationId') organizationId: string) {
    return this.venteService.findByOrganizationId(organizationId);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Vente' })
  findAll() {
    return this.venteService.findAll();
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Vente' })
  findOne(@Param('id') id: string) {
    return this.venteService.findOne(id);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Vente' })
  create(@Body() dto: CreateVenteDto) {
    const data: Prisma.VenteCreateInput = {
      organization: { connect: { id: dto.organizationId } },
      ...(dto.userId ? { user: { connect: { id: dto.userId } } } : {}),
      ...(dto.sessionCaisseId
        ? { sessionCaisse: { connect: { id: dto.sessionCaisseId } } }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.totalAmount !== undefined ? { totalAmount: dto.totalAmount } : {}),
      ...(dto.numeroTicket !== undefined ? { numeroTicket: dto.numeroTicket } : {}),
      ...(dto.ticketImprimeAt !== undefined
        ? { ticketImprimeAt: new Date(dto.ticketImprimeAt) }
        : {}),
    };
    return this.venteService.create(data);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Vente' })
  update(@Param('id') id: string, @Body() dto: UpdateVenteDto) {
    const data: Prisma.VenteUpdateInput = {
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.totalAmount !== undefined ? { totalAmount: dto.totalAmount } : {}),
      ...(dto.numeroTicket !== undefined ? { numeroTicket: dto.numeroTicket } : {}),
      ...(dto.ticketImprimeAt !== undefined
        ? {
            ticketImprimeAt: dto.ticketImprimeAt
              ? new Date(dto.ticketImprimeAt)
              : null,
          }
        : {}),
    };
    if (dto.userId !== undefined) {
      data.user =
        dto.userId === null
          ? { disconnect: true }
          : { connect: { id: dto.userId } };
    }
    if (dto.sessionCaisseId !== undefined) {
      data.sessionCaisse =
        dto.sessionCaisseId === null
          ? { disconnect: true }
          : { connect: { id: dto.sessionCaisseId } };
    }
    return this.venteService.update(id, data);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Vente' })
  remove(@Param('id') id: string) {
    return this.venteService.remove(id);
  }
}
