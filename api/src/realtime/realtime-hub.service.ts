import { Injectable, MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';

export type RealtimeEventType = 'notification' | 'message';

@Injectable()
export class RealtimeHubService {
  private readonly subjects = new Map<string, Subject<MessageEvent>>();

  streamFor(userId: string): Subject<MessageEvent> {
    let subject = this.subjects.get(userId);
    if (!subject) {
      subject = new Subject<MessageEvent>();
      this.subjects.set(userId, subject);
    }
    return subject;
  }

  emit(userId: string, type: RealtimeEventType, payload: unknown): void {
    const subject = this.streamFor(userId);
    subject.next({
      type,
      data: JSON.stringify(payload),
    });
  }

  emitToMany(userIds: string[], type: RealtimeEventType, payload: unknown): void {
    for (const id of new Set(userIds)) {
      this.emit(id, type, payload);
    }
  }
}
