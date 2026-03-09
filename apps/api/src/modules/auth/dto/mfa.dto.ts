import { IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class EnableMfaDto {}

export class VerifyMfaDto {
  @ApiProperty({ description: "6-digit TOTP code" })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class LoginMfaDto {
  @ApiProperty({ description: "Temporary MFA token from login response" })
  @IsString()
  mfaToken: string;

  @ApiProperty({ description: "6-digit TOTP code" })
  @IsString()
  @Length(6, 6)
  code: string;
}
