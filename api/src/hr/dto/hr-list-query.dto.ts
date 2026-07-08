import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../lib/pagination-query.dto';

const EMPLOYEE_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'TERMINATED',
] as const;

export class HrListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(EMPLOYEE_STATUSES)
  status?: (typeof EMPLOYEE_STATUSES)[number];
}

export class HrEmployeeScopedListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4')
  employeeId?: string;
}
