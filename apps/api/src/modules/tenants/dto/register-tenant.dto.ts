import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterTenantDto {
  @ApiProperty({ description: "Company name", example: "Acme Logistics" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  companyName: string;

  @ApiProperty({
    description: "Unique tenant code (2-10 uppercase alphanumeric characters)",
    example: "ACME",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(10)
  @Matches(/^[A-Z0-9]+$/, {
    message: "tenantCode must be uppercase alphanumeric characters only",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.toUpperCase() : value))
  tenantCode: string;

  @ApiProperty({ description: "Admin user email address", example: "admin@acme.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: "Admin user display name", example: "John Smith" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName: string;

  @ApiProperty({ description: "Admin password (min 8 characters)" })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
