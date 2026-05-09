import {
  Body,
  Controller,
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
  CreateStockOrderDto,
  UpdateStockOrderStatusDto,
} from './dto/stock-order.dto';
import { StockOrderService } from './stock-order.service';

@Controller('stock-order')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class StockOrderController {
  constructor(private readonly stockOrderService: StockOrderService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'StockOrder' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.stockOrderService.findAll(viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'StockOrder' })
  create(
    @Body() dto: CreateStockOrderDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.stockOrderService.create(dto, viewer);
  }

  @Patch(':id/status')
  @CheckPolicies({ action: 'update', subject: 'StockOrder' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStockOrderStatusDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.stockOrderService.updateStatus(id, dto.status, viewer);
  }
}
