import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { CreateStockAdjustmentDto } from './dto/stock-movement.dto';
import { StockMovementService } from './stock-movement.service';

@Controller('stock-movement')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class StockMovementController {
  constructor(private readonly stockMovementService: StockMovementService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'StockMovement' })
  findAll(
    @CurrentUser() viewer: AuthenticatedUser,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.stockMovementService.findAll(viewer, organizationId);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'StockMovement' })
  findOne(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.stockMovementService.findOne(id, viewer);
  }

  @Post('adjustment')
  @CheckPolicies({ action: 'update', subject: 'Stock' })
  recordAdjustment(
    @Body() dto: CreateStockAdjustmentDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.stockMovementService.recordAdjustment(
      dto.organizationId,
      dto.productId,
      dto.quantityDelta,
      dto.label,
      viewer,
    );
  }
}
