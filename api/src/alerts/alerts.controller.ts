import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { AlertsService } from './alerts.service';

@Controller('alerts')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  /** Alertes filtrées côté service selon les sujets lisibles (Stock, Budget, …). */
  @Get('dashboard')
  @CheckPolicies({ action: 'read', subject: 'Notification' })
  getDashboard(@CurrentUser() viewer: AuthenticatedUser) {
    return this.alertsService.getDashboardAlerts(viewer);
  }
}
