import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionCaisseModule } from '../session-caisse/session-caisse.module';
import { TreasuryModule } from '../treasury/treasury.module';
import { VenteController } from './vente.controller';
import { VenteService } from './vente.service';

@Module({
  imports: [PrismaModule, SessionCaisseModule, TreasuryModule],
  controllers: [VenteController],
  providers: [VenteService],
  exports: [VenteService],
})
export class VenteModule {}
