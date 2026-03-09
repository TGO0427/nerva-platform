import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class WorkOrderImportRowDto {
  @ApiProperty()
  @IsString()
  sku: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  qtyOrdered: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plannedStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plannedEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ImportWorkOrdersDto {
  @ApiProperty({
    type: [WorkOrderImportRowDto],
    description: "Array of work orders to import (max 500)",
  })
  @ValidateNested({ each: true })
  @Type(() => WorkOrderImportRowDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  rows: WorkOrderImportRowDto[];
}
