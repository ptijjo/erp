import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
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
  @IsString()
  @MaxLength(100)
  contractType?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  renewalAlertDays?: number;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  documentUrl?: string;

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
  @IsString()
  @MaxLength(100)
  contractType?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  renewalAlertDays?: number;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  documentUrl?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'])
  status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
