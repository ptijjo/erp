import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly redis: Redis;
  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: Number(this.configService.get('REDIS_PORT')),
      password: this.configService.get('REDIS_PASSWORD'),
    });
  }
  async onModuleInit() {
    try {
      await this.redis.ping();
      Logger.log('Redis connected successfully');
    } catch (error) {
      Logger.error('Redis connection failed', error);
      throw error;
    }
  }
  async set(key: string, value: string) {
    return await this.redis.set(key, value);
  }
  async get(key: string) {
    return await this.redis.get(key);
  }
  async del(key: string) {
    return await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }

  /** SET key value EX seconds */
  async setEx(key: string, seconds: number, value: string): Promise<void> {
    await this.redis.set(key, value, 'EX', seconds);
  }
}
