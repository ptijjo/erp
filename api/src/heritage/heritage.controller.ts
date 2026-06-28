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
import { CreateHeritageAssetDto, UpdateHeritageAssetDto } from './dto/heritage.dto';
import { HeritageService } from './heritage.service';

@Controller('heritage/assets')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class HeritageController {
  constructor(private readonly heritageService: HeritageService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'HeritageAsset' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.heritageService.findAll(viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'HeritageAsset' })
  findOne(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.heritageService.findOne(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'HeritageAsset' })
  create(@Body() dto: CreateHeritageAssetDto, @CurrentUser() viewer: AuthenticatedUser) {
    return this.heritageService.create(dto, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'HeritageAsset' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHeritageAssetDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.heritageService.update(id, dto, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'HeritageAsset' })
  remove(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.heritageService.remove(id, viewer);
  }
}
