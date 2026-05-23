import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  /** Requis pour un utilisateur maison mère ; ignoré / imposé pour une filiale. */
  @IsOptional()
  @IsUUID('4')
  organizationId?: string;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
}
