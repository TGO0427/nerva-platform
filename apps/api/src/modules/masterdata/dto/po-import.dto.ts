import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseOrderImportRowDto {
  @ApiProperty()
  @IsNumber()
  orderGroup: number;

  @ApiProperty()
  @IsString()
  supplierCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty()
  @IsString()
  sku: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  qty: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}

export class ImportPurchaseOrdersDto {
  @ApiProperty({ type: [PurchaseOrderImportRowDto], description: 'Array of purchase order rows to import (max 500)' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderImportRowDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  rows: PurchaseOrderImportRowDto[];
}
