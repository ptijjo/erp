/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsEmail, IsString, IsStrongPassword } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email' })
  public email: string;

  @IsString({ message: 'Password is required' })
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
        'Password is too weak. It must contain at least 9 characters, 1 uppercase letter, 1 lowercase letter, 1 number and 1 symbol',
    },
  )
  public password: string;
}
