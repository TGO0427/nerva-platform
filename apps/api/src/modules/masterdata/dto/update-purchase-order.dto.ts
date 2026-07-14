import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsIn,
  IsBoolean,
  MaxLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ description: "Status" })
  @IsOptional()
  @IsString()
  @IsIn(["DRAFT", "SENT", "CONFIRMED", "PARTIAL", "RECEIVED", "CANCELLED"])
  status?: string;

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
}
