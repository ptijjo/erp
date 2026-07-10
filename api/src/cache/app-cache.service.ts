import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const DEFAULT_TTL_SECONDS = 300;

@Injectable()
export class AppCacheService {
  constructor(private readonly redis: RedisService) {}

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (raw == null) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds = DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    await this.redis.setEx(key, ttlSeconds, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
