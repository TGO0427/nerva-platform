import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsIn,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSupplierContractDto {
  @ApiPropertyOptional({ description: 'Contract name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Contract status',
    enum: ['DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Contract start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Contract end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Contract terms and conditions' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  terms?: string;

  @ApiPropertyOptional({ description: 'Total contract value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalValue?: number;
}
