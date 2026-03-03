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

export class SalesOrderImportRowDto {
  @ApiProperty()
  @IsNumber()
  orderGroup: number;

  @ApiProperty()
  @IsString()
  customerCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requestedShipDate?: string;

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
  unitPrice?: number;
}

export class ImportSalesOrdersDto {
  @ApiProperty({ type: [SalesOrderImportRowDto], description: 'Array of sales order rows to import (max 500)' })
  @ValidateNested({ each: true })
  @Type(() => SalesOrderImportRowDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  rows: SalesOrderImportRowDto[];
}
