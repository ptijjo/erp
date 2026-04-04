import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VenteLineController } from './vente-line.controller';
import { VenteLineService } from './vente-line.service';
import { VentePaiementController } from './vente-paiement.controller';
import { VentePaiementService } from './vente-paiement.service';
import { VenteController } from './vente.controller';
import { VenteService } from './vente.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    VenteController,
    VenteLineController,
    VentePaiementController,
  ],
  providers: [VenteService, VenteLineService, VentePaiementService],
  exports: [VenteService, VenteLineService, VentePaiementService],
})
export class VenteModule {}
