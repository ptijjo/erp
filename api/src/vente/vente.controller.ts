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
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import {
  AddVenteLineDto,
  ConfirmVenteDto,
  UpdateVenteLineDto,
} from './dto/vente.dto';
import { VenteService } from './vente.service';

@Controller('vente')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class VenteController {
  constructor(private readonly venteService: VenteService) {}

  @Get('scan/:qrCode')
  @CheckPolicies({ action: 'read', subject: 'Vente' })
  scanProduct(
    @Param('qrCode') qrCode: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.venteService.scanProduct(qrCode, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Vente' })
  create(@CurrentUser() viewer: AuthenticatedUser) {
    return this.venteService.create(viewer);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Vente' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.venteService.findAll(viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Vente' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.venteService.findOne(id, viewer);
  }

  @Post(':id/lines')
  @CheckPolicies({ action: 'update', subject: 'Vente' })
  addLine(
    @Param('id') id: string,
    @Body() dto: AddVenteLineDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.venteService.addLine(id, dto, viewer);
  }

  @Patch(':id/lines/:lineId')
  @CheckPolicies({ action: 'update', subject: 'Vente' })
  updateLine(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateVenteLineDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.venteService.updateLine(id, lineId, dto.quantity, viewer);
  }

  @Delete(':id/lines/:lineId')
  @CheckPolicies({ action: 'update', subject: 'Vente' })
  removeLine(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.venteService.removeLine(id, lineId, viewer);
  }

  @Post(':id/confirm')
  @CheckPolicies({ action: 'update', subject: 'Vente' })
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmVenteDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.venteService.confirm(id, dto, viewer);
  }

  @Post(':id/cancel')
  @CheckPolicies({ action: 'update', subject: 'Vente' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.venteService.cancel(id, viewer);
  }
}
