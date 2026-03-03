import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsArray,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTripDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plannedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plannedStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  shipmentIds?: string[];
}

export class AddStopDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gpsLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  gpsLng?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class AssignTripDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverName?: string;
}

export class CompleteTripDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  forceComplete?: boolean;
}

export class CancelTripDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ResequenceStopsDto {
  @ApiProperty()
  @IsArray()
  @IsUUID(undefined, { each: true })
  stopIds: string[];
}

export class CompleteStopDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  podSignature?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  podPhoto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  podNotes?: string;
}

export class FailStopDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class SkipStopDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
