import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateRmaLineDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  qtyExpected: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reasonCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitCreditAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salesOrderLineId?: string;
}

export class CreateRmaDto {
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salesOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shipmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  returnType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ type: [CreateRmaLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRmaLineDto)
  lines: CreateRmaLineDto[];
}

export class ReceiveRmaLineDto {
  @ApiProperty()
  @IsUUID()
  lineId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  qtyReceived: number;

  @ApiProperty()
  @IsUUID()
  receivingBinId: string;
}

export class SetDispositionDto {
  @ApiProperty()
  @IsUUID()
  lineId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  disposition: string;

  @ApiProperty()
  @IsUUID()
  dispositionBinId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  inspectionNotes?: string;
}

export class CancelRmaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
