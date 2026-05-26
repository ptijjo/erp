import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingController } from './messaging.controller';
import { MessagingPolicyService } from './messaging-policy.service';
import { MessagingService } from './messaging.service';

@Module({
  imports: [PrismaModule],
  controllers: [MessagingController],
  providers: [MessagingPolicyService, MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
