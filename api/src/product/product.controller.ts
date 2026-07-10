import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import type { Prisma } from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { PaginationQueryDto } from '../lib/pagination-query.dto';

@Controller('product')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('qr/:qrCode')
  @CheckPolicies({ action: 'read', subject: 'Product' })
  findByQr(
    @Param('qrCode') qrCode: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.productService.findByQrCode(qrCode, viewer);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Product' })
  findAll(
    @CurrentUser() viewer: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.productService.findAll(viewer, query);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Product' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.productService.findOne(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Product' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    const data: Prisma.ProductCreateInput = {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      category: { connect: { id: dto.categoryId } },
      ...(dto.offeredToSubsidiaries !== undefined
        ? { offeredToSubsidiaries: dto.offeredToSubsidiaries }
        : {}),
      ...(dto.supplierIds?.length
        ? {
            productSuppliers: {
              create: dto.supplierIds.map((supplierId) => ({
                supplier: { connect: { id: supplierId } },
              })),
            },
          }
        : {}),
    };
    return this.productService.create(data, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Product' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    const data: Prisma.ProductUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.price !== undefined ? { price: dto.price } : {}),
      ...(dto.categoryId !== undefined
        ? { category: { connect: { id: dto.categoryId } } }
        : {}),
      ...(dto.offeredToSubsidiaries !== undefined
        ? { offeredToSubsidiaries: dto.offeredToSubsidiaries }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, 'supplierIds')
        ? {
            productSuppliers: {
              deleteMany: {},
              ...(dto.supplierIds?.length
                ? {
                    create: dto.supplierIds.map((supplierId) => ({
                      supplier: { connect: { id: supplierId } },
                    })),
                  }
                : {}),
            },
          }
        : {}),
    };
    return this.productService.update(id, data, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Product' })
  remove(
    @Param('id') id: string,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.productService.remove(id, viewer);
  }
}
