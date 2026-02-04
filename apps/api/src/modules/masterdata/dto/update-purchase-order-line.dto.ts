import {
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePurchaseOrderLineDto {
  @ApiPropertyOptional({ description: 'Quantity ordered' })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  qtyOrdered?: number;

  @ApiPropertyOptional({ description: 'Quantity received' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  qtyReceived?: number;

  @ApiPropertyOptional({ description: 'Unit cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}
