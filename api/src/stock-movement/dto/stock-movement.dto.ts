import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateStockAdjustmentDto {
  @IsUUID('4')
  organizationId!: string;

  @IsUUID('4')
  productId!: string;

  @IsInt()
  @Type(() => Number)
  quantityDelta!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  label?: string;
}
