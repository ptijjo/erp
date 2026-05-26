import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBudgetSupplementDto {
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amountRequested!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason!: string;
}

export class ReviewBudgetSupplementDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  financeNote?: string;
}

export class RejectBudgetSupplementDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  rejectionReason!: string;
}
