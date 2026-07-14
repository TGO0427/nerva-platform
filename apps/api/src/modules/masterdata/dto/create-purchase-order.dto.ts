import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePurchaseOrderLineDto_Inline {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsNumber()
  qtyOrdered: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitCost?: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: "Supplier ID" })
  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

  @ApiPropertyOptional({ description: "Order date" })
  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @ApiPropertyOptional({ description: "Expected delivery date" })
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiPropertyOptional({ description: "Ship to warehouse ID" })
  @IsOptional()
  @IsUUID()
  shipToWarehouseId?: string;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description: "Flag this PO as an import order (auto-creates a linked Import Shipment on confirm)",
  })
  @IsOptional()
  @IsBoolean()
  isImport?: boolean;

  @ApiPropertyOptional({ description: "Order lines" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto_Inline)
  lines?: CreatePurchaseOrderLineDto_Inline[];
}
