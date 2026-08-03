import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const BIN_TYPES = [
  "STORAGE",
  "PICKING",
  "RECEIVING",
  "QUARANTINE",
  "SHIPPING",
  "SCRAP",
] as const;

export class CreateBinDto {
  @ApiProperty({ description: "Bin code/location", example: "A-01-01" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    description: "Type of bin",
    enum: BIN_TYPES,
    default: "STORAGE",
    example: "STORAGE",
  })
  @IsOptional()
  @IsString()
  @IsIn(BIN_TYPES)
  binType?: string;

  @ApiPropertyOptional({
    description: "Pallet-position capacity of this bin",
    default: 1,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  capacityPallets?: number;
}
