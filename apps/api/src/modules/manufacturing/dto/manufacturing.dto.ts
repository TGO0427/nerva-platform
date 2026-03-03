import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  IsBoolean,
  IsDate,
  IsObject,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============ Workstations ============

export class CreateWorkstationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workstationType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityPerHour?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerHour?: number;
}

export class UpdateWorkstationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workstationType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityPerHour?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerHour?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

// ============ BOMs ============

export class BomLineDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  qtyPer: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  scrapPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateBomDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ type: [BomLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BomLineDto)
  lines: BomLineDto[];
}

export class UpdateBomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  revision?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class AddBomLineDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  qtyPer: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  scrapPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateBomLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  qtyPer?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  scrapPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

// ============ Routings ============

export class RoutingOperationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workstationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  setupTimeMins?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  runTimeMins: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  queueTimeMins?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  overlapPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSubcontracted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreateRoutingDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ type: [RoutingOperationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutingOperationDto)
  operations: RoutingOperationDto[];
}

export class UpdateRoutingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

// ============ Work Orders ============

export class CreateWorkOrderDto {
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderNo?: string;

  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bomHeaderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  routingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  qtyOrdered: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedStart?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedEnd?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salesOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateWorkOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bomHeaderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  routingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  qtyOrdered?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedStart?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedEnd?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpsertWorkOrderChecksDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reworkProduct?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reworkQtyKgs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  theoreticalBoxes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  actualBoxes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  actualOvers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  actualTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  diffToTheoretical?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  loaderSignature?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operationsManagerSignature?: string;
}

export class UpsertWorkOrderProcessDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  specsJson?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  potUsed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeStarted?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  time85c?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeFlavourAdded?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeCompleted?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  additions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonForAddition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;
}

export class CompleteOperationDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  qtyCompleted: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  qtyScrapped?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  setupTimeActual?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  runTimeActual?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class IssueMaterialDto {
  @ApiProperty()
  @IsUUID()
  materialId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  qty: number;

  @ApiProperty()
  @IsUUID()
  binId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNo?: string;
}

export class ReturnMaterialDto {
  @ApiProperty()
  @IsUUID()
  materialId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  qty: number;

  @ApiProperty()
  @IsUUID()
  binId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonCode?: string;
}

export class RecordOutputDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  qty: number;

  @ApiProperty()
  @IsUUID()
  binId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  operationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workstationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class RecordScrapDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  qty: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  binId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  operationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class RescheduleWorkOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedStart?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  plannedEnd?: Date;
}

// ============ Non-Conformances ============

export class CreateNonConformanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  defectType: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  severity: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  qtyAffected?: number;
}

export class UpdateNonConformanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defectType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  qtyAffected?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  disposition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correctiveAction?: string;
}

export class ResolveNonConformanceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  disposition: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  correctiveAction: string;
}
