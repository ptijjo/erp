import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

export const LEAVE_TYPES = [
  'PAID_LEAVE',
  'RTT',
  'SICK_LEAVE',
  'UNPAID_LEAVE',
] as const;

export type LeaveTypeValue = (typeof LEAVE_TYPES)[number];

export class CreateLeaveRequestDto {
  @IsUUID('4')
  employeeId!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsIn(LEAVE_TYPES)
  type?: LeaveTypeValue;
}

export class UpdateLeaveRequestStatusDto {
  @IsIn(['APPROVED', 'REJECTED', 'CANCELLED'])
  status!: 'APPROVED' | 'REJECTED' | 'CANCELLED';
}
