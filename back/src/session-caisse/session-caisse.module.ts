import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionCaisseController } from './session-caisse.controller';
import { SessionCaisseService } from './session-caisse.service';

@Module({
  imports: [PrismaModule],
  controllers: [SessionCaisseController],
  providers: [SessionCaisseService],
  exports: [SessionCaisseService],
})
export class SessionCaisseModule {}
