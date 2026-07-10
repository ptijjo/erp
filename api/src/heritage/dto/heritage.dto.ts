import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateHeritageAssetDto {
  @IsUUID('4')
  organizationId!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsDateString()
  acquiredAt?: string;

  @IsOptional()
  @Min(0)
  @Type(() => Number)
  value?: number;

  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  depreciationRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  maintenanceNotes?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  documentUrl?: string;

  @IsOptional()
  @IsDateString()
  lastInventoryAt?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'MAINTENANCE', 'RETIRED'])
  status?: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
}

export class UpdateHeritageAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsDateString()
  acquiredAt?: string;

  @IsOptional()
  @Min(0)
  @Type(() => Number)
  value?: number;

  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  depreciationRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  maintenanceNotes?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  documentUrl?: string;

  @IsOptional()
  @IsDateString()
  lastInventoryAt?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'MAINTENANCE', 'RETIRED'])
  status?: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
}
