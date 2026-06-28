import { Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
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
  @Min(0)
  @Type(() => Number)
  value?: number;

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
  @Min(0)
  @Type(() => Number)
  value?: number;

  @IsOptional()
  @IsIn(['ACTIVE', 'MAINTENANCE', 'RETIRED'])
  status?: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
}
