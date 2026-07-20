import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { MessagingController } from './messaging.controller';
import { MessagingPolicyService } from './messaging-policy.service';
import { MessagingAttachmentService } from './messaging-attachment.service';
import { MessagingService } from './messaging.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [MessagingController],
  providers: [
    MessagingPolicyService,
    MessagingAttachmentService,
    MessagingService,
  ],
  exports: [MessagingService, MessagingAttachmentService],
})
export class MessagingModule {}
