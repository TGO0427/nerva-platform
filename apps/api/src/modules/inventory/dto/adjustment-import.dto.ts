import { Type } from 'class-transformer';
import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  Min,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustmentImportRowDto {
  @ApiProperty()
  @IsNumber()
  adjustmentGroup: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  warehouseName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  binCode: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  qtyAfter: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNo?: string;
}

export class ImportAdjustmentsDto {
  @ApiProperty({ type: [AdjustmentImportRowDto] })
  @ValidateNested({ each: true })
  @Type(() => AdjustmentImportRowDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  rows: AdjustmentImportRowDto[];
}
