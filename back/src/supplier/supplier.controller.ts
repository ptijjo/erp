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
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { SupplierService } from './supplier.service';

@Controller('supplier')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Supplier' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.supplierService.findAll(viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Supplier' })
  create(
    @Body() dto: CreateSupplierDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.supplierService.create(dto, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Supplier' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.supplierService.update(id, dto, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Supplier' })
  remove(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.supplierService.remove(id, viewer);
  }
}
