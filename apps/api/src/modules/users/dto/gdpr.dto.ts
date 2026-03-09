import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class DeleteAccountDto {
  @ApiProperty({ description: "Current password to confirm account deletion" })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password: string;
}
