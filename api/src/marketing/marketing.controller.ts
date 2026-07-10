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
import { CreateMarketingCampaignDto, UpdateMarketingCampaignDto } from './dto/marketing.dto';
import { MarketingService } from './marketing.service';

@Controller('marketing/campaigns')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get()
  @CheckPolicies({ action: 'read', subject: 'MarketingCampaign' })
  findAll(@CurrentUser() viewer: AuthenticatedUser) {
    return this.marketingService.findAll(viewer);
  }

  @Get(':id')
  @CheckPolicies({ action: 'read', subject: 'MarketingCampaign' })
  findOne(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.marketingService.findOne(id, viewer);
  }

  @Post()
  @CheckPolicies({ action: 'create', subject: 'MarketingCampaign' })
  create(@Body() dto: CreateMarketingCampaignDto, @CurrentUser() viewer: AuthenticatedUser) {
    return this.marketingService.create(dto, viewer);
  }

  @Patch(':id')
  @CheckPolicies({ action: 'update', subject: 'MarketingCampaign' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMarketingCampaignDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.marketingService.update(id, dto, viewer);
  }

  @Delete(':id')
  @CheckPolicies({ action: 'delete', subject: 'MarketingCampaign' })
  remove(@Param('id') id: string, @CurrentUser() viewer: AuthenticatedUser) {
    return this.marketingService.remove(id, viewer);
  }
}
