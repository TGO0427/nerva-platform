import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierNoteDto {
  @ApiProperty({ description: 'Note content', example: 'Discussed pricing for Q2 2025' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
