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
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Controller('product')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('qr/:qrCode')
  @CheckPolicies({ action: 'read', subject: 'Product' })
  findByQr(@Param('qrCode') qrCode: string) {
    return this.productService.findByQrCode(qrCode);
  }

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Product' })
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Product' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Product' })
  create(@Body() dto: CreateProductDto) {
    const data: Prisma.ProductCreateInput = {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      category: { connect: { id: dto.categoryId } },
    };
    return this.productService.create(data);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Product' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    const data: Prisma.ProductUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.price !== undefined ? { price: dto.price } : {}),
      ...(dto.categoryId !== undefined
        ? { category: { connect: { id: dto.categoryId } } }
        : {}),
    };
    return this.productService.update(id, data);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Product' })
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
