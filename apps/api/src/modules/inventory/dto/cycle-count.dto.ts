import {
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCycleCountDto {
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBlind?: boolean;
}

export class AddCycleCountLineDto {
  @ApiProperty()
  @IsUUID()
  binId: string;

  @ApiProperty()
  @IsUUID()
  itemId: string;
}

export class AddCycleCountLinesFromBinDto {
  @ApiProperty()
  @IsUUID()
  binId: string;
}

export class RecordCountDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  countedQty: number;
}
