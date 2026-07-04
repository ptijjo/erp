import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { CaslModule } from '../casl/casl.module';
import { UserController } from './user.controller';

@Module({
  imports: [PrismaModule, StorageModule, CaslModule],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
