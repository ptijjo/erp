import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { ModePaiement } from '../../generated/prisma/client';

export class CreateVentePaiementDto {
  @IsUUID('4')
  venteId!: string;

  @IsEnum(ModePaiement)
  modePaiement!: ModePaiement;

  @IsNumber()
  @Type(() => Number)
  amount!: number;
}

export class UpdateVentePaiementDto {
  @IsEnum(ModePaiement)
  @IsOptional()
  modePaiement?: ModePaiement;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  amount?: number;
}
