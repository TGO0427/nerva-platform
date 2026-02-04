import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerNoteDto {
  @ApiProperty({ description: 'Note content', example: 'Discussed pricing terms' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
