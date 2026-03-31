import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrganizationType } from '../../generated/prisma/client';
import { Transform } from 'class-transformer';

export class CreateOrganizationDto {
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({
    message: "Le slug de l'organisation doit être une chaîne de caractères",
  })
  @IsNotEmpty({ message: "Le slug de l'organisation est requis" })
  public slug!: string;

  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({
    message: "Le nom de l'organisation doit être une chaîne de caractères",
  })
  @IsNotEmpty({ message: "Le nom de l'organisation est requis" })
  public name!: string;

  @IsString({
    message:
      "La description de l'organisation doit être une chaîne de caractères",
  })
  @IsOptional({ message: "La description de l'organisation est facultative" })
  public description?: string;

  @IsEnum(OrganizationType, {
    message: "Le type d'organisation doit être une chaîne de caractères",
  })
  @IsNotEmpty({ message: "Le type d'organisation est requis" })
  public organizationType!: OrganizationType;
}

export class UpdateOrganizationDto {
  @IsString({
    message: "Le nom de l'organisation doit être une chaîne de caractères",
  })
  @IsOptional({ message: "Le nom de l'organisation est facultatif" })
  public name?: string;

  @IsString({
    message:
      "La description de l'organisation doit être une chaîne de caractères",
  })
  @IsOptional({ message: "La description de l'organisation est facultative" })
  public description?: string;

  @IsString({
    message: "Le slug de l'organisation doit être une chaîne de caractères",
  })
  @IsOptional({ message: "Le slug de l'organisation est facultatif" })
  public slug?: string;
}
