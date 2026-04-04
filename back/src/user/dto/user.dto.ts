import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  IsUUID,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'Email est requis' })
  public email!: string;

  @IsString({ message: 'Mot de passe est requis' })
  @IsNotEmpty({ message: 'Mot de passe est requis' })
  @IsStrongPassword(
    {
      minLength: 9,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Mot de passe doit contenir au moins 9 caractères, une lettre majuscule, une lettre minuscule, un chiffre et un symbole',
    },
  )
  public password!: string;

  @IsString({ message: 'ID du rôle est requis' })
  @IsNotEmpty({ message: 'ID du rôle est requis' })
  @IsUUID('4', { message: 'ID du rôle doit être un UUID valide' })
  public roleId!: string;

  @IsString({ message: "ID de l'organisation est requis" })
  @IsNotEmpty({ message: "ID de l'organisation est requis" })
  @IsUUID('4', { message: "ID de l'organisation doit être un UUID valide" })
  public organizationId!: string;
}

export class UpdateUserDto {
  @IsString({ message: 'Mot de passe est requis' })
  @IsNotEmpty({ message: 'Mot de passe est requis' })
  @IsStrongPassword(
    {
      minLength: 9,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Mot de passe doit contenir au moins 9 caractères, une lettre majuscule, une lettre minuscule, un chiffre et un symbole',
    },
  )
  @IsOptional()
  public password?: string;

  @IsString({ message: "ID de l'organisation est requis" })
  @IsNotEmpty({ message: "ID de l'organisation est requis" })
  @IsUUID('4', { message: "ID de l'organisation doit être un UUID valide" })
  @IsOptional()
  public organizationId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID du rôle doit être un UUID valide' })
  public roleId?: string;
}
