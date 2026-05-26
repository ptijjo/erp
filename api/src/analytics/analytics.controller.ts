import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsOverviewQueryDto } from './dto/analytics-query.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(
    @Query() query: AnalyticsOverviewQueryDto,
    @CurrentUser() viewer: AuthenticatedUser,
  ) {
    return this.analyticsService.getGroupOverview(viewer, query);
  }
}
