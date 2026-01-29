import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const BIN_TYPES = ['STORAGE', 'PICKING', 'RECEIVING', 'QUARANTINE', 'SHIPPING', 'SCRAP'] as const;

export class CreateBinDto {
  @ApiProperty({ description: 'Bin code/location', example: 'A-01-01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    description: 'Type of bin',
    enum: BIN_TYPES,
    default: 'STORAGE',
    example: 'STORAGE',
  })
  @IsOptional()
  @IsString()
  @IsIn(BIN_TYPES)
  binType?: string;
}
