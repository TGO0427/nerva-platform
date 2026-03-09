import { IsNotEmpty, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResetPasswordDto {
  @ApiProperty({ description: "Password reset token" })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: "New password (minimum 8 characters)" })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
