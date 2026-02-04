import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierItemDto {
  @ApiProperty({ description: 'Item ID to link to supplier' })
  @IsUUID()
  itemId: string;

  @ApiPropertyOptional({ description: "Supplier's own SKU/part number" })
  @IsOptional()
  @IsString()
  supplierSku?: string;

  @ApiPropertyOptional({ description: 'Unit cost from supplier' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ description: 'Lead time in days' })
  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @ApiPropertyOptional({ description: 'Minimum order quantity', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minOrderQty?: number;

  @ApiPropertyOptional({ description: 'Is this the preferred supplier for this item?', default: false })
  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;
}
