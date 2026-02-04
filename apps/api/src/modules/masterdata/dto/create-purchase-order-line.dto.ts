import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePurchaseOrderLineDto {
  @ApiProperty({ description: 'Item ID' })
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: 'Quantity ordered' })
  @IsNumber()
  @Min(0.001)
  qtyOrdered: number;

  @ApiPropertyOptional({ description: 'Unit cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}
