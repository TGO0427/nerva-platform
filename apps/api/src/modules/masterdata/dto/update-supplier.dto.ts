import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSupplierDto {
  @ApiPropertyOptional({ description: 'Supplier code', example: 'SUP-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ description: 'Supplier name', example: 'Global Supplies Inc.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Email address', example: 'orders@supplier.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+1 234 567 8900' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'VAT registration number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vatNo?: string;

  @ApiPropertyOptional({ description: 'Primary contact person name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Company registration number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNo?: string;

  // Postal Address
  @ApiPropertyOptional({ description: 'Postal address line 1' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string;

  @ApiPropertyOptional({ description: 'Postal address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiPropertyOptional({ description: 'Postal city' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Postal country' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  // Trading Address
  @ApiPropertyOptional({ description: 'Trading address line 1' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradingAddressLine1?: string;

  @ApiPropertyOptional({ description: 'Trading address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradingAddressLine2?: string;

  @ApiPropertyOptional({ description: 'Trading city' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tradingCity?: string;

  @ApiPropertyOptional({ description: 'Trading postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tradingPostalCode?: string;

  @ApiPropertyOptional({ description: 'Trading country' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tradingCountry?: string;

  @ApiPropertyOptional({ description: 'Whether the supplier is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
