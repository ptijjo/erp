import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { VenteStatut } from '../../generated/prisma/client';

export class CreateVenteDto {
  @IsUUID('4')
  organizationId!: string;

  @IsUUID('4')
  @IsOptional()
  userId?: string;

  @IsUUID('4')
  @IsOptional()
  sessionCaisseId?: string;

  @IsEnum(VenteStatut)
  @IsOptional()
  status?: VenteStatut;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  totalAmount?: number;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  numeroTicket?: number;

  @IsDateString()
  @IsOptional()
  ticketImprimeAt?: string;
}

export class UpdateVenteDto {
  @IsEnum(VenteStatut)
  @IsOptional()
  status?: VenteStatut;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  totalAmount?: number;

  @IsUUID('4')
  @IsOptional()
  userId?: string | null;

  @IsUUID('4')
  @IsOptional()
  sessionCaisseId?: string | null;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  numeroTicket?: number | null;

  @IsDateString()
  @IsOptional()
  ticketImprimeAt?: string | null;
}
