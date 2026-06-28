import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateLegalContractDto {
  @IsUUID('4')
  organizationId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(200)
  partyName!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'])
  status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateLegalContractDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  partyName?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'])
  status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
