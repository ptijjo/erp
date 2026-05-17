import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PoleController } from './pole.controller';
import { PoleService } from './pole.service';

@Module({
  imports: [PrismaModule],
  controllers: [PoleController],
  providers: [PoleService],
  exports: [PoleService],
})
export class PoleModule {}
