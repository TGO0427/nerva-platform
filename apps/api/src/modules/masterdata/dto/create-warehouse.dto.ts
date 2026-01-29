import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseDto {
  @ApiProperty({ description: 'Site ID the warehouse belongs to' })
  @IsUUID()
  @IsNotEmpty()
  siteId: string;

  @ApiProperty({ description: 'Warehouse name', example: 'Main Distribution Center' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Warehouse code', example: 'WH-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;
}
