import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateItemDto {
  @ApiPropertyOptional({
    description: "Item description",
    example: "Widget A - Blue",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ description: "Unit of measure", example: "EA" })
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

  @ApiPropertyOptional({
    description: "Whether the item is active",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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
