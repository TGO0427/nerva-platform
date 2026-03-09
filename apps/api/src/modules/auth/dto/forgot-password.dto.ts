import { IsEmail, IsNotEmpty, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ForgotPasswordDto {
  @ApiProperty({ description: "Tenant ID" })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: "User email address" })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
