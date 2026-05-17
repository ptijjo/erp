import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStockOrderDto {
  @IsUUID('4')
  productId!: string;

  @IsUUID('4')
  supplierId!: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class UpdateStockOrderStatusDto {
  @IsIn(['PENDING', 'CONFIRMED', 'CANCELLED'])
  status!: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}
