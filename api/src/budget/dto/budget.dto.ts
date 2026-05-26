import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  BUDGET_LINE_CATEGORIES,
  BUDGET_LINE_NATURES,
  type BudgetLineCategoryValue,
  type BudgetLineNatureValue,
} from '../budget-line.defaults';

export class CreateBudgetLineDto {
  @IsIn(BUDGET_LINE_CATEGORIES)
  category!: BudgetLineCategoryValue;

  @IsOptional()
  @IsIn(BUDGET_LINE_NATURES)
  nature?: BudgetLineNatureValue;

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

export class SubmitBudgetDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  financeNote?: string;
}

export class RejectBudgetDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  rejectionReason!: string;
}
