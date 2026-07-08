import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const WORK_SHIFT_STATUSES = [
  'PLANNED',
  'CONFIRMED',
  'CANCELLED',
] as const;

export type WorkShiftStatusValue = (typeof WORK_SHIFT_STATUSES)[number];

export const WORK_SHIFT_KINDS = ['WORK', 'BREAK'] as const;

export type WorkShiftKindValue = (typeof WORK_SHIFT_KINDS)[number];

export class CreateWorkShiftDto {
  @IsUUID('4')
  employeeId!: string;

  @IsDate()
  @Type(() => Date)
  startAt!: Date;

  @IsDate()
  @Type(() => Date)
  endAt!: Date;

  @IsOptional()
  @IsIn(WORK_SHIFT_STATUSES)
  status?: WorkShiftStatusValue;

  @IsOptional()
  @IsIn(WORK_SHIFT_KINDS)
  kind?: WorkShiftKindValue;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateWorkShiftDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startAt?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endAt?: Date;

  @IsOptional()
  @IsIn(WORK_SHIFT_STATUSES)
  status?: WorkShiftStatusValue;

  @IsOptional()
  @IsIn(WORK_SHIFT_KINDS)
  kind?: WorkShiftKindValue;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class WorkShiftCalendarQueryDto {
  @IsDate()
  @Type(() => Date)
  from!: Date;

  @IsDate()
  @Type(() => Date)
  to!: Date;

  @IsOptional()
  @IsUUID('4')
  employeeId?: string;
}
