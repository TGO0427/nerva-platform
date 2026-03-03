import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIbtDto {
  @ApiProperty()
  @IsUUID()
  fromWarehouseId: string;

  @ApiProperty()
  @IsUUID()
  toWarehouseId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class AddIbtLineDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  qtyRequested: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fromBinId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNo?: string;
}

export class ShipIbtLineDto {
  @ApiProperty()
  @IsUUID()
  lineId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  qtyShipped: number;
}

export class ShipIbtDto {
  @ApiProperty({ type: [ShipIbtLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipIbtLineDto)
  lines: ShipIbtLineDto[];
}

export class ReceiveIbtLineDto {
  @ApiProperty()
  @IsUUID()
  lineId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  qtyReceived: number;

  @ApiProperty()
  @IsUUID()
  toBinId: string;
}

export class ReceiveIbtDto {
  @ApiProperty({ type: [ReceiveIbtLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveIbtLineDto)
  lines: ReceiveIbtLineDto[];
}
