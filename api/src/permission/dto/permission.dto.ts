import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdatePermissionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class LinkPermissionRoleDto {
  @IsUUID('4')
  permissionId!: string;

  @IsUUID('4')
  roleId!: string;
}
