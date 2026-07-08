import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DirectoryModule } from '../directory/directory.module';
import { MessagingController } from './messaging.controller';
import { MessagingPolicyService } from './messaging-policy.service';
import { MessagingService } from './messaging.service';

@Module({
  imports: [PrismaModule, DirectoryModule],
  controllers: [MessagingController],
  providers: [MessagingPolicyService, MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
