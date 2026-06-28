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

export class CreateStockTransferDto {
  @IsUUID('4')
  fromOrganizationId!: string;

  @IsUUID('4')
  toOrganizationId!: string;

  @IsUUID('4')
  productId!: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class UpdateStockTransferStatusDto {
  @IsIn(['SHIPPED', 'RECEIVED', 'CANCELLED'])
  status!: 'SHIPPED' | 'RECEIVED' | 'CANCELLED';
}
