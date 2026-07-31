import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  IsDate,
  IsDateString,
  IsIn,
  IsBoolean,
  ValidateNested,
  MaxLength,
  Min,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ALL_IMPORT_SHIPMENT_STATUSES,
  INSPECTION_FAILURE_REASON_VALUES,
} from "@nerva/shared";

const TRANSPORT_MODES = ["AIR", "SEA", "ROAD"];

export class CreateImportShipmentLineDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  productDescription: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cbm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  palletQty?: number;

  @ApiPropertyOptional({ enum: TRANSPORT_MODES })
  @IsOptional()
  @IsIn(TRANSPORT_MODES)
  transportMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  carrier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  vesselOrAwb?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  destinationPort?: string;

  @ApiPropertyOptional({ enum: ALL_IMPORT_SHIPMENT_STATUSES })
  @IsOptional()
  @IsIn(ALL_IMPORT_SHIPMENT_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  weekStartDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  weekEndDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: "Per-unit purchase cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ description: "This line's share of freight cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freightCost?: number;

  @ApiPropertyOptional({ description: "This line's share of customs duty" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dutyCost?: number;

  @ApiPropertyOptional({ description: "This line's share of clearing/handling cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  clearingCost?: number;

  @ApiPropertyOptional({ description: "Total landed cost for this line" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  landedCost?: number;
}

export class CreateImportShipmentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  reference: string;

  @ApiProperty()
  @IsUUID()
  supplierId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  incoterm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ type: [CreateImportShipmentLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateImportShipmentLineDto)
  lines: CreateImportShipmentLineDto[];
}

export class UpdateImportShipmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  siteId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  incoterm?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({ type: [CreateImportShipmentLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateImportShipmentLineDto)
  lines?: CreateImportShipmentLineDto[];
}

export class UpdateImportShipmentLineStatusDto {
  @ApiProperty({ enum: ALL_IMPORT_SHIPMENT_STATUSES })
  @IsIn(ALL_IMPORT_SHIPMENT_STATUSES)
  status: string;
}

export class UpdateImportShipmentLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cbm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  palletQty?: number;

  @ApiPropertyOptional({ enum: TRANSPORT_MODES })
  @IsOptional()
  @IsIn(TRANSPORT_MODES)
  transportMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  carrier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  vesselOrAwb?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  destinationPort?: string;

  @ApiPropertyOptional({ enum: ALL_IMPORT_SHIPMENT_STATUSES })
  @IsOptional()
  @IsIn(ALL_IMPORT_SHIPMENT_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  weekStartDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  weekEndDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: "Per-unit purchase cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ description: "This line's share of freight cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freightCost?: number;

  @ApiPropertyOptional({ description: "This line's share of customs duty" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dutyCost?: number;

  @ApiPropertyOptional({ description: "This line's share of clearing/handling cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  clearingCost?: number;

  @ApiPropertyOptional({ description: "Total landed cost for this line" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  landedCost?: number;
}

export class CompleteInspectionDto {
  @ApiProperty()
  @IsBoolean()
  passed: boolean;

  @ApiPropertyOptional({ enum: INSPECTION_FAILURE_REASON_VALUES })
  @IsOptional()
  @IsIn(INSPECTION_FAILURE_REASON_VALUES)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class StartReceivingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}

export class CompleteReceivingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  receivedQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  binId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  binLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  discrepancyNotes?: string;
}
