import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { AbsenceStatut, AbsenceType } from '../../generated/prisma/client';

export class CreateAbsenceDto {
  @IsEnum(AbsenceType)
  type!: AbsenceType;

  @IsDateString()
  debut!: string;

  @IsDateString()
  fin!: string;

  @IsEnum(AbsenceStatut)
  @IsOptional()
  statut?: AbsenceStatut;

  @IsString()
  @IsOptional()
  commentaire?: string | null;

  @IsUUID('4')
  userId!: string;

  @IsUUID('4')
  organizationId!: string;
}

export class UpdateAbsenceDto {
  @IsEnum(AbsenceType)
  @IsOptional()
  type?: AbsenceType;

  @IsDateString()
  @IsOptional()
  debut?: string;

  @IsDateString()
  @IsOptional()
  fin?: string;

  @IsEnum(AbsenceStatut)
  @IsOptional()
  statut?: AbsenceStatut;

  @IsString()
  @IsOptional()
  commentaire?: string | null;
}
