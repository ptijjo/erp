import { Type } from 'class-transformer';
import {
  IsArray,
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

  /** Fournisseurs autorisés pour les commandes filiales (maison mère). */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  supplierIds?: string[];
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

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  supplierIds?: string[];
}
