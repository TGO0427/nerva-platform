import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferStockDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsUUID()
  fromBinId: string;

  @ApiProperty()
  @IsUUID()
  toBinId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  qty: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNo?: string;
}
