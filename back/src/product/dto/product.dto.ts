import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  price!: number;

  @IsUUID('4')
  categoryId!: string;

  @IsBoolean()
  @IsOptional()
  offeredToSubsidiaries?: boolean;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  price?: number;

  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @IsBoolean()
  @IsOptional()
  offeredToSubsidiaries?: boolean;
}
