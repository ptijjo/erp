import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { BulletinPaieLigneSens } from '../../generated/prisma/client';

export class CreateBulletinPaieLigneDto {
  @IsUUID('4')
  bulletinId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  libelle!: string;

  @IsNumber()
  @Type(() => Number)
  montant!: number;

  @IsEnum(BulletinPaieLigneSens)
  sens!: BulletinPaieLigneSens;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  ordre?: number;
}

export class UpdateBulletinPaieLigneDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  libelle?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  montant?: number;

  @IsEnum(BulletinPaieLigneSens)
  @IsOptional()
  sens?: BulletinPaieLigneSens;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  ordre?: number;
}
