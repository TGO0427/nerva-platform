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
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkstationImportRowDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class ImportWorkstationsDto {
  @ApiProperty({ type: [WorkstationImportRowDto] })
  @ValidateNested({ each: true })
  @Type(() => WorkstationImportRowDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  rows: WorkstationImportRowDto[];
}
