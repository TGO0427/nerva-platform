import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSupplierItemDto {
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

  @ApiPropertyOptional({ description: 'Minimum order quantity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minOrderQty?: number;

  @ApiPropertyOptional({ description: 'Is this the preferred supplier for this item?' })
  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;

  @ApiPropertyOptional({ description: 'Is this supplier item active?' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
