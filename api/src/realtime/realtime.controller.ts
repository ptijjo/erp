import { Controller, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { PoliciesGuard } from '../casl/policies.guard';
import { RealtimeHubService } from './realtime-hub.service';

@Controller('realtime')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class RealtimeController {
  constructor(private readonly hub: RealtimeHubService) {}

  /**
   * Flux SSE : événements `notification` et `message`.
   * Le client doit utiliser EventSource avec `withCredentials: true`.
   */
  @Sse('events')
  @CheckPolicies({ action: 'read', subject: 'Notification' })
  events(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.hub.streamFor(user.sub).asObservable();
  }
}
