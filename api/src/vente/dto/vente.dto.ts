import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

const MODE_PAIEMENT = ['ESPECES', 'CARTE', 'MOBILE_MONEY'] as const;

export class AddVenteLineDto {
  @IsOptional()
  @IsUUID('4')
  productId?: string;

  /** Alternative au productId : scan douchette / caméra. */
  @IsOptional()
  @IsString()
  qrCode?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;
}

export class UpdateVenteLineDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;
}

export class VentePaiementDto {
  @IsIn(MODE_PAIEMENT)
  modePaiement!: (typeof MODE_PAIEMENT)[number];

  @Min(0)
  @Type(() => Number)
  amount!: number;
}

export class ConfirmVenteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VentePaiementDto)
  paiements!: VentePaiementDto[];
}
