import { firstValueFrom, take } from 'rxjs';
import { RealtimeHubService } from './realtime-hub.service';

describe('RealtimeHubService', () => {
  let hub: RealtimeHubService;

  beforeEach(() => {
    hub = new RealtimeHubService();
  });

  it('supprime le Subject quand le dernier abonné SSE se déconnecte', async () => {
    const obs = hub.observeFor('user-a');
    const sub = obs.subscribe();
    expect(hub.activeSubscriberCount('user-a')).toBe(1);

    sub.unsubscribe();
    expect(hub.activeSubscriberCount('user-a')).toBe(0);
    expect(hub.hasSubject('user-a')).toBe(false);
  });

  it('conserve le Subject s’il reste un autre abonné', async () => {
    const sub1 = hub.observeFor('user-a').subscribe();
    const sub2 = hub.observeFor('user-a').subscribe();
    expect(hub.activeSubscriberCount('user-a')).toBe(2);

    sub1.unsubscribe();
    expect(hub.hasSubject('user-a')).toBe(true);
    expect(hub.activeSubscriberCount('user-a')).toBe(1);

    sub2.unsubscribe();
    expect(hub.hasSubject('user-a')).toBe(false);
  });

  it('émet un ping initial sur observeFor', async () => {
    const first = await firstValueFrom(hub.observeFor('user-b').pipe(take(1)));
    expect(first.type).toBe('ping');
  });
});
