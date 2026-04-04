import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BulletinPaieLigneController } from './bulletin-paie-ligne.controller';
import { BulletinPaieLigneService } from './bulletin-paie-ligne.service';
import { BulletinPaieController } from './bulletin-paie.controller';
import { BulletinPaieService } from './bulletin-paie.service';

@Module({
  imports: [PrismaModule],
  controllers: [BulletinPaieController, BulletinPaieLigneController],
  providers: [BulletinPaieService, BulletinPaieLigneService],
  exports: [BulletinPaieService, BulletinPaieLigneService],
})
export class BulletinPaieModule {}
