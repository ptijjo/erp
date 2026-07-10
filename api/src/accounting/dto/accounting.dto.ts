import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const CHART_ACCOUNT_TYPES = [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE',
] as const;

export type ChartAccountTypeValue = (typeof CHART_ACCOUNT_TYPES)[number];

export class CreateChartAccountDto {
  @IsUUID('4')
  organizationId!: string;

  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsIn(CHART_ACCOUNT_TYPES)
  accountType!: ChartAccountTypeValue;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID('4')
  parentId?: string;
}

export class UpdateChartAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsIn(CHART_ACCOUNT_TYPES)
  accountType?: ChartAccountTypeValue;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID('4')
  parentId?: string | null;
}

export class CreateJournalEntryLineDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  label?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  debit!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  credit!: number;

  @IsUUID('4')
  chartAccountId!: string;
}

export class CreateJournalEntryDto {
  @IsUUID('4')
  organizationId!: string;

  @IsDateString()
  entryDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateJournalEntryLineDto)
  lines!: CreateJournalEntryLineDto[];
}

export class UpdateJournalEntryDto {
  @IsOptional()
  @IsDateString()
  entryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateJournalEntryLineDto)
  lines?: CreateJournalEntryLineDto[];
}
