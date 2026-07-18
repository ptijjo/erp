import { Controller, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.strategy/jwt-auth.guard';
import { RealtimeHubService } from './realtime-hub.service';

/**
 * Flux SSE temps réel (notifications + messages).
 * Auth JWT cookie uniquement — pas de CASL Notification obligatoire
 * (sinon un utilisateur messagerie-only ne se connecte jamais).
 */
@Controller('realtime')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class RealtimeController {
  constructor(private readonly hub: RealtimeHubService) {}

  /**
   * Événements : `notification`, `message`, `ping` (heartbeat).
   * Client : EventSource avec `withCredentials: true`.
   */
  @Sse('events')
  events(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.hub.observeFor(user.sub);
  }
}
