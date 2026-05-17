import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateStockDto {
  @IsUUID('4')
  organizationId!: string;

  @IsUUID('4')
  productId!: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  quantity?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minQuantity?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  maxQuantity?: number | null;
}

export class UpdateStockDto {
  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  quantity?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minQuantity?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  maxQuantity?: number | null;
}

export class UpsertStockDto {
  @IsUUID('4')
  organizationId!: string;

  @IsUUID('4')
  productId!: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  quantity?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minQuantity?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  maxQuantity?: number | null;
}
