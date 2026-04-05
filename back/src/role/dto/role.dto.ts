import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRoleDto {
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'Le nom du rôle doit être une chaîne de caractères' })
  @IsNotEmpty()
  public name!: string;

  @IsString({
    message: 'La description du rôle doit être une chaîne de caractères',
  })
  @IsOptional({ message: 'La description du rôle est facultative' })
  public description?: string;

  /** Rôle limité à une organisation (ex. direction maison mère) ; absent = rôle global. */
  @IsUUID('4', { message: "L'identifiant d'organisation doit être un UUID valide" })
  @IsOptional()
  public organizationScopeId?: string;
}

export class UpdateRoleDto {
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'Le nom du rôle doit être une chaîne de caractères' })
  @IsOptional({ message: 'Le nom du rôle est facultatif' })
  public name?: string;

  @IsString({
    message: 'La description du rôle doit être une chaîne de caractères',
  })
  @IsOptional({ message: 'La description du rôle est facultative' })
  public description?: string;
}
