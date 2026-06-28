import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import {
  CreateStockTransferDto,
  UpdateStockTransferStatusDto,
} from './dto/stock-transfer.dto';
import { StockTransferService } from './stock-transfer.service';

@Controller('stock-transfer')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class StockTransferController {
  constructor(private readonly stockTransferService: StockTransferService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'StockTransfer' })
  findAll(
    @CurrentUser() viewer: AuthenticatedUser,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.stockTransferService.findAll(viewer, organizationId);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'StockTransfer' })
  create(
    @Body() dto: CreateStockTransferDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.stockTransferService.create(dto, viewer);
  }

  @Patch(':id/status')
  @CheckPolicies({ action: 'update', subject: 'StockTransfer' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStockTransferStatusDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.stockTransferService.updateStatus(id, dto, viewer);
  }
}
