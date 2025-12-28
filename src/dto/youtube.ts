import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class callback {

  @IsNotEmpty()
  @IsString()
  code?: string;

}

export class uploadVideo {

  @IsOptional()
  @IsString()
  url?: string;

  @IsNotEmpty()
  @IsString()
  @IsEnum(['public', 'unlisted', 'private'])
  visibility?: string;

}