import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResendVerificationDto {
  @ApiProperty({ description: "Tenant ID or tenant code" })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: "User email address" })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
