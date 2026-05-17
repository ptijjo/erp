import { Injectable } from '@nestjs/common';

type Entry = { value: string; expiresAt: number | null };

/** Redis factice pour les tests d'intégration (refresh, blocage login). */
@Injectable()
export class InMemoryRedisService {
  private readonly store = new Map<string, Entry>();

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, { value, expiresAt: null });
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const v = await this.get(key);
    return v !== null;
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const next = (current ? Number.parseInt(current, 10) : 0) + 1;
    await this.set(key, String(next));
    return next;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (!entry) return;
    entry.expiresAt = Date.now() + seconds * 1000;
  }

  async setEx(key: string, seconds: number, value: string): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + seconds * 1000,
    });
  }

  async getDel(key: string): Promise<string | null> {
    const value = await this.get(key);
    await this.del(key);
    return value;
  }

  clear(): void {
    this.store.clear();
  }
}
