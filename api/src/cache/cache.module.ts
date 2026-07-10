import { Global, Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { AppCacheService } from './app-cache.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [AppCacheService],
  exports: [AppCacheService],
})
export class CacheModule {}
