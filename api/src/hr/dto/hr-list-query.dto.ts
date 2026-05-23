import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../lib/pagination-query.dto';

export class HrListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class HrEmployeeScopedListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4')
  employeeId?: string;
}
