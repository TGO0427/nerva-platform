import { Type } from "class-transformer";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BomImportRowDto {
  @ApiProperty()
  @IsNumber()
  bomGroup: number;

  @ApiProperty({ description: "SKU of the finished product" })
  @IsString()
  @IsNotEmpty()
  productSku: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: "SKU of the component/ingredient" })
  @IsString()
  @IsNotEmpty()
  componentSku: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  qtyPer: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  scrapPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}

export class ImportBomsDto {
  @ApiProperty({ type: [BomImportRowDto] })
  @ValidateNested({ each: true })
  @Type(() => BomImportRowDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  rows: BomImportRowDto[];
}
