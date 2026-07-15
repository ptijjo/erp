import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { CaslModule } from '../casl/casl.module';
import { HrModule } from '../hr/hr.module';
import { MessagingModule } from '../messaging/messaging.module';
import { UserController } from './user.controller';

@Module({
  imports: [PrismaModule, StorageModule, CaslModule, HrModule, MessagingModule],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
