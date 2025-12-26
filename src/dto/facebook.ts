import { IsNotEmpty, IsString } from 'class-validator';

export class GetFacebookAccessToken {

  @IsNotEmpty()
  @IsString()
  short_token?: string;

}

export class FinalConnect {

  @IsNotEmpty()
  @IsString()
  long_live_token?: string;

}