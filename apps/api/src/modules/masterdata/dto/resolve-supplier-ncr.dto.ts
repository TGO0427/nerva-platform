import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveSupplierNcrDto {
  @ApiProperty({ description: 'Resolution description', example: 'Replacement shipped and received' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  resolution: string;
}
