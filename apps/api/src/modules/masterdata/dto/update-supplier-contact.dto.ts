import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSupplierContactDto {
  @ApiPropertyOptional({ description: 'Contact name', example: 'John Smith' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Email address', example: 'john@supplier.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+27 82 123 4567' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Job title', example: 'Sales Manager' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ description: 'Is this the primary contact?' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Is contact active?' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
