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
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Controller('category')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'Category' })
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'Category' })
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'Category' })
  create(@Body() dto: CreateCategoryDto) {
    const data: Prisma.CategoryCreateInput = {
      name: dto.name,
      description: dto.description,
      ...(dto.parentId
        ? { parent: { connect: { id: dto.parentId } } }
        : {}),
    };
    return this.categoryService.create(data);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'Category' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const data: Prisma.CategoryUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.parentId !== undefined
        ? dto.parentId === null
          ? { parent: { disconnect: true } }
          : { parent: { connect: { id: dto.parentId } } }
        : {}),
    };
    return this.categoryService.update(id, data);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'Category' })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
