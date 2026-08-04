import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateItemDto {
  @ApiProperty({ description: "Stock keeping unit", example: "PROD-001" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku: string;

  @ApiProperty({ description: "Item description", example: "Widget A - Blue" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @ApiPropertyOptional({
    description: "Unit of measure",
    example: "EA",
    default: "EA",
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  uom?: string;

  @ApiPropertyOptional({ description: "Weight in kilograms", example: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @ApiPropertyOptional({ description: "Length in centimeters", example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthCm?: number;

  @ApiPropertyOptional({ description: "Width in centimeters", example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  widthCm?: number;

  @ApiPropertyOptional({ description: "Height in centimeters", example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  heightCm?: number;

  @ApiPropertyOptional({ description: "Harmonized System (customs) code", example: "8481.80" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  hsCode?: string;

  @ApiPropertyOptional({ description: "Country of origin", example: "South Africa" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  countryOfOrigin?: string;

  @ApiPropertyOptional({
    description: "Whether this item requires a batch/lot number to be received and picked",
  })
  @IsOptional()
  @IsBoolean()
  requiresBatchTracking?: boolean;
}
