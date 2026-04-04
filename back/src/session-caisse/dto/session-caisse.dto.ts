import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { SessionCaisseStatut } from '../../generated/prisma/client';

export class CreateSessionCaisseDto {
  @IsUUID('4')
  organizationId!: string;

  @IsUUID('4')
  userId!: string;

  @IsNumber()
  @Type(() => Number)
  fondOuverture!: number;

  @IsEnum(SessionCaisseStatut)
  @IsOptional()
  statut?: SessionCaisseStatut;
}

export class UpdateSessionCaisseDto {
  @IsEnum(SessionCaisseStatut)
  @IsOptional()
  statut?: SessionCaisseStatut;

  @IsDateString()
  @IsOptional()
  closedAt?: string | null;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  fondCloture?: number | null;

  @IsString()
  @IsOptional()
  commentaireCloture?: string | null;

  @IsUUID('4')
  @IsOptional()
  closedByUserId?: string | null;
}
