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
import { StockService } from './stock.service';
import {
  CreateStockDto,
  UpdateStockDto,
  UpsertStockDto,
} from './dto/stock.dto';

@Controller('stock')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('by-org-product/:organizationId/:productId')
  @CheckPolicies({ action: 'read', subject: 'Stock' })
  findByOrgProduct(
    @Param('organizationId') organizationId: string,
    @Param('productId') productId: string,
  ) {
    return this.stockService.findByOrganizationAndProduct(
      organizationId,
      productId,
    );
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Stock' })
  findAll() {
    return this.stockService.findAll();
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Stock' })
  findOne(@Param('id') id: string) {
    return this.stockService.findOne(id);
  }

  @Post('upsert')
  @CheckPolicies({ action: 'update', subject: 'Stock' })
  upsert(@Body() dto: UpsertStockDto) {
    return this.stockService.upsertForOrgProduct(
      dto.organizationId,
      dto.productId,
      {
        quantity: dto.quantity,
        minQuantity: dto.minQuantity,
        maxQuantity: dto.maxQuantity,
      },
    );
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Stock' })
  create(@Body() dto: CreateStockDto) {
    const data: Prisma.StockCreateInput = {
      quantity: dto.quantity ?? 0,
      minQuantity: dto.minQuantity ?? 0,
      maxQuantity: dto.maxQuantity ?? undefined,
      organization: { connect: { id: dto.organizationId } },
      product: { connect: { id: dto.productId } },
    };
    return this.stockService.create(data);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Stock' })
  update(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    const data: Prisma.StockUpdateInput = {
      ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
      ...(dto.minQuantity !== undefined
        ? { minQuantity: dto.minQuantity }
        : {}),
      ...(dto.maxQuantity !== undefined
        ? { maxQuantity: dto.maxQuantity }
        : {}),
    };
    return this.stockService.update(id, data);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Stock' })
  remove(@Param('id') id: string) {
    return this.stockService.remove(id);
  }
}
