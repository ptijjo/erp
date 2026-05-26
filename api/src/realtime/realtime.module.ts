import { Global, Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RealtimeHubService } from './realtime-hub.service';

@Global()
@Module({
  controllers: [RealtimeController],
  providers: [RealtimeHubService],
  exports: [RealtimeHubService],
})
export class RealtimeModule {}
