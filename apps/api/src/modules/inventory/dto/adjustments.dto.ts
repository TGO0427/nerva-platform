import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdjustmentDto {
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cycleCountId?: string;
}

export class AddAdjustmentLineDto {
  @ApiProperty()
  @IsUUID()
  binId: string;

  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  qtyAfter: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNo?: string;
}
