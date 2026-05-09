import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Catégories supportées ; pour l’instant seul LOYER est exposé. */
const BUDGET_LINE_CATEGORIES = ['LOYER'] as const;

export class CreateBudgetLineDto {
  @IsIn(BUDGET_LINE_CATEGORIES)
  category!: (typeof BUDGET_LINE_CATEGORIES)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amountPlanned!: number;
}

export class CreateBudgetDto {
  @IsUUID('4')
  subsidiaryOrganizationId!: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetLineDto)
  lines!: CreateBudgetLineDto[];
}

export class UpdateBudgetDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetLineDto)
  lines!: CreateBudgetLineDto[];
}
