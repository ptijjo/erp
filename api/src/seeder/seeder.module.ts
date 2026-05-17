import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [SeederService],
  exports: [SeederService],
  imports: [PrismaModule],
})
export class SeederModule {}
