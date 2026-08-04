import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateGrnLineDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  qtyExpected: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNo?: string;
}

export class CreateGrnDto {
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ type: [CreateGrnLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGrnLineDto)
  lines?: CreateGrnLineDto[];
}

export class ScanGrnItemDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  qtyReceived: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty()
  @IsUUID()
  receivingBinId: string;
}
