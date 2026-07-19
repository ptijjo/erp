import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export type RealtimeEventType = 'notification' | 'message' | 'ping';

const HEARTBEAT_MS = 20_000;

@Injectable()
export class RealtimeHubService {
  private readonly subjects = new Map<string, Subject<MessageEvent>>();
  private readonly subscriberCounts = new Map<string, number>();

  /** Exposé pour les tests / diagnostics. */
  hasSubject(userId: string): boolean {
    return this.subjects.has(userId);
  }

  /** Exposé pour les tests / diagnostics. */
  activeSubscriberCount(userId: string): number {
    return this.subscriberCounts.get(userId) ?? 0;
  }

  streamFor(userId: string): Subject<MessageEvent> {
    let subject = this.subjects.get(userId);
    if (!subject) {
      subject = new Subject<MessageEvent>();
      this.subjects.set(userId, subject);
    }
    return subject;
  }

  /**
   * Observable SSE par utilisateur : heartbeat pour garder la connexion ouverte
   * (proxies / navigateurs coupent sinon les flux idle).
   */
  observeFor(userId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const subject = this.streamFor(userId);
      this.subscriberCounts.set(
        userId,
        (this.subscriberCounts.get(userId) ?? 0) + 1,
      );

      const sub = subject.subscribe({
        next: (event) => subscriber.next(event),
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });

      subscriber.next({
        type: 'ping',
        data: JSON.stringify({ ts: Date.now() }),
      });

      const heartbeat = setInterval(() => {
        subscriber.next({
          type: 'ping',
          data: JSON.stringify({ ts: Date.now() }),
        });
      }, HEARTBEAT_MS);

      return () => {
        clearInterval(heartbeat);
        sub.unsubscribe();
        const next = (this.subscriberCounts.get(userId) ?? 1) - 1;
        if (next <= 0) {
          this.subscriberCounts.delete(userId);
          const owned = this.subjects.get(userId);
          this.subjects.delete(userId);
          owned?.complete();
        } else {
          this.subscriberCounts.set(userId, next);
        }
      };
    });
  }

  emit(userId: string, type: RealtimeEventType, payload: unknown): void {
    if (type === 'ping') return;
    const subject = this.subjects.get(userId);
    if (!subject) return;
    subject.next({
      type,
      data: JSON.stringify(payload),
    });
  }

  emitToMany(
    userIds: string[],
    type: RealtimeEventType,
    payload: unknown,
  ): void {
    for (const id of new Set(userIds)) {
      this.emit(id, type, payload);
    }
  }
}
