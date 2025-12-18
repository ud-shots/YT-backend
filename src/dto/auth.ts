import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class signUp {

  @IsNotEmpty()
  @IsString()
  @IsEmail({}, { message: 'Invalid Email Format!' })
  email?: string;

  @IsNotEmpty()
  @IsString()
  username?: string;

  @IsNotEmpty()
  @IsString()
  password?: string;

}

export class login {

  @IsNotEmpty()
  @IsString()
  email?: string;

  @IsNotEmpty()
  @IsString()
  password?: string;

}

export class ssoLogin {

  @IsNotEmpty()
  @IsString()
  token?: string;

}