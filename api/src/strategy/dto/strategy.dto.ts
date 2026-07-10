import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStrategyProjectDto {
  @IsUUID('4')
  organizationId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  priority?: number;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @Min(0)
  @Type(() => Number)
  budgetEstimate?: number;
}

export class UpdateStrategyProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  priority?: number;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @Min(0)
  @Type(() => Number)
  budgetEstimate?: number;
}
