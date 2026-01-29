import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const BIN_TYPES = ['STORAGE', 'PICKING', 'RECEIVING', 'QUARANTINE', 'SHIPPING', 'SCRAP'] as const;

export class UpdateBinDto {
  @ApiPropertyOptional({ description: 'Bin code/location', example: 'A-01-01' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({
    description: 'Type of bin',
    enum: BIN_TYPES,
    example: 'STORAGE',
  })
  @IsOptional()
  @IsString()
  @IsIn(BIN_TYPES)
  binType?: string;

  @ApiPropertyOptional({ description: 'Whether the bin is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
