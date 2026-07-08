import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const WEEK_DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export type WeekDayValue = (typeof WEEK_DAYS)[number];

export const RECURRING_SHIFT_KINDS = ['WORK', 'BREAK'] as const;

export type RecurringShiftKindValue = (typeof RECURRING_SHIFT_KINDS)[number];

export class CreateRecurringWorkShiftDto {
  @IsUUID('4')
  employeeId!: string;

  @IsIn(WEEK_DAYS)
  dayOfWeek!: WeekDayValue;

  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute!: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute!: number;

  @IsOptional()
  @IsIn(RECURRING_SHIFT_KINDS)
  kind?: RecurringShiftKindValue;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateRecurringWorkShiftDto {
  @IsOptional()
  @IsIn(WEEK_DAYS)
  dayOfWeek?: WeekDayValue;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute?: number;

  @IsOptional()
  @IsIn(RECURRING_SHIFT_KINDS)
  kind?: RecurringShiftKindValue;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class GenerateWeekDto {
  @IsDate()
  @Type(() => Date)
  weekStart!: Date;
}
