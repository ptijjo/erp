import { Type } from 'class-transformer';
import {
  Allow,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import type { Prisma } from '../../generated/prisma/client';
import { BulletinPaieStatut } from '../../generated/prisma/client';

export class CreateBulletinPaieDto {
  @IsInt()
  @Min(1900)
  @Max(3000)
  @Type(() => Number)
  annee!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  mois!: number;

  @IsEnum(BulletinPaieStatut)
  @IsOptional()
  statut?: BulletinPaieStatut;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  brutTotal?: number | null;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  netAPayer?: number | null;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  chargesPatronales?: number | null;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  chargesSalariales?: number | null;

  @Allow()
  @IsOptional()
  donneesBrutes?: Prisma.InputJsonValue;

  @IsDateString()
  @IsOptional()
  generatedAt?: string | null;

  @IsUUID('4')
  userId!: string;

  @IsUUID('4')
  organizationId!: string;
}

export class UpdateBulletinPaieDto {
  @IsEnum(BulletinPaieStatut)
  @IsOptional()
  statut?: BulletinPaieStatut;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  brutTotal?: number | null;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  netAPayer?: number | null;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  chargesPatronales?: number | null;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  chargesSalariales?: number | null;

  @Allow()
  @IsOptional()
  donneesBrutes?: Prisma.InputJsonValue | null;

  @IsDateString()
  @IsOptional()
  generatedAt?: string | null;
}
