import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  MaxLength,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePickWaveDto {
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty()
  @IsArray()
  @IsUUID(undefined, { each: true })
  orderIds: string[];
}

export class CancelPickWaveDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ConfirmPickTaskDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  qtyPicked: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortReason?: string;
}

export class CancelPickTaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CreateShipmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiProperty()
  @IsUUID()
  salesOrderId: string;
}

export class ShipShipmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  carrier: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  trackingNo: string;
}
