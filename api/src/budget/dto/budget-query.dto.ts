import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { BUDGET_LINE_CATEGORIES } from '../budget-line.defaults';

const BUDGET_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
] as const;

export class ListBudgetQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsUUID('4')
  subsidiaryOrganizationId?: string;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month?: number;

  @IsOptional()
  @IsIn(BUDGET_STATUSES)
  status?: (typeof BUDGET_STATUSES)[number];
}

export class BudgetOverviewQueryDto {
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsUUID('4')
  subsidiaryOrganizationId?: string;
}

export const BUDGET_EXPENSE_CATEGORIES = BUDGET_LINE_CATEGORIES;
