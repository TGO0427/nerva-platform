import { IsString, IsNotEmpty, IsIn, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierNcrDto {
  @ApiProperty({
    description: 'NCR type',
    example: 'QUALITY',
    enum: ['QUALITY', 'DELIVERY', 'QUANTITY', 'DOCUMENTATION', 'OTHER'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['QUALITY', 'DELIVERY', 'QUANTITY', 'DOCUMENTATION', 'OTHER'])
  ncrType: string;

  @ApiProperty({ description: 'Description of the non-conformance', example: 'Product arrived damaged' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;
}
