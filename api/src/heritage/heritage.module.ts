import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HeritageController } from './heritage.controller';
import { HeritageService } from './heritage.service';

@Module({
  imports: [PrismaModule],
  controllers: [HeritageController],
  providers: [HeritageService],
})
export class HeritageModule {}
