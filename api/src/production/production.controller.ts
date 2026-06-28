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
  CreateProductionOrderDto,
  UpdateProductionOrderDto,
} from './dto/production.dto';
import { ProductionService } from './production.service';

@Controller('production/orders')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'ProductionOrder' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.productionService.findAll(viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'ProductionOrder' })
  findOne(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.productionService.findOne(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'ProductionOrder' })
  create(
    @Body() dto: CreateProductionOrderDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.productionService.create(dto, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'ProductionOrder' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductionOrderDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.productionService.update(id, dto, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'ProductionOrder' })
  remove(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.productionService.remove(id, viewer);
  }
}
