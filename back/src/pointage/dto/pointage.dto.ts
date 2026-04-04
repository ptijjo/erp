import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { PointageStatut } from '../../generated/prisma/client';

export class CreatePointageDto {
  @IsDateString()
  entreeAt!: string;

  @IsDateString()
  @IsOptional()
  sortieAt?: string | null;

  @IsEnum(PointageStatut)
  @IsOptional()
  statut?: PointageStatut;

  @IsUUID('4')
  userId!: string;

  @IsUUID('4')
  organizationId!: string;

  @IsUUID('4')
  @IsOptional()
  planningShiftId?: string | null;

  @IsUUID('4')
  @IsOptional()
  validatedByUserId?: string | null;
}

export class UpdatePointageDto {
  @IsDateString()
  @IsOptional()
  entreeAt?: string;

  @IsDateString()
  @IsOptional()
  sortieAt?: string | null;

  @IsEnum(PointageStatut)
  @IsOptional()
  statut?: PointageStatut;

  @IsDateString()
  @IsOptional()
  validatedAt?: string | null;

  @IsUUID('4')
  @IsOptional()
  planningShiftId?: string | null;

  @IsUUID('4')
  @IsOptional()
  validatedByUserId?: string | null;
}
