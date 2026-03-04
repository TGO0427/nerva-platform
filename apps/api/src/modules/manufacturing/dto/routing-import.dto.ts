import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoutingImportRowDto {
  @ApiProperty()
  @IsNumber()
  routingGroup: number;

  @ApiProperty({ description: 'SKU of the finished product' })
  @IsString()
  @IsNotEmpty()
  productSku: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Operation name' })
  @IsString()
  @IsNotEmpty()
  operationName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workstationCode?: string;

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
}

export class ImportRoutingsDto {
  @ApiProperty({ type: [RoutingImportRowDto] })
  @ValidateNested({ each: true })
  @Type(() => RoutingImportRowDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  rows: RoutingImportRowDto[];
}
