import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ContratType } from '../../generated/prisma/client';

export class CreateContratDto {
  @IsEnum(ContratType)
  type!: ContratType;

  @IsDateString()
  dateDebut!: string;

  @IsDateString()
  @IsOptional()
  dateFin?: string | null;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  heuresHebdomadaires?: number | null;

  @IsBoolean()
  @IsOptional()
  actif?: boolean;

  @IsString()
  @IsOptional()
  commentaire?: string | null;

  @IsUUID('4')
  userId!: string;

  @IsUUID('4')
  organizationId!: string;
}

export class UpdateContratDto {
  @IsEnum(ContratType)
  @IsOptional()
  type?: ContratType;

  @IsDateString()
  @IsOptional()
  dateDebut?: string;

  @IsDateString()
  @IsOptional()
  dateFin?: string | null;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  heuresHebdomadaires?: number | null;

  @IsBoolean()
  @IsOptional()
  actif?: boolean;

  @IsString()
  @IsOptional()
  commentaire?: string | null;
}
