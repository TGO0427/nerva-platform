import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ description: 'Customer code', example: 'CUST-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ description: 'Customer name', example: 'Acme Corporation' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Email address', example: 'contact@acme.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+1 234 567 8900' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'VAT registration number', example: 'GB123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vatNo?: string;

  @ApiPropertyOptional({ description: 'Billing address line 1' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  billingAddressLine1?: string;

  @ApiPropertyOptional({ description: 'Billing address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  billingAddressLine2?: string;

  @ApiPropertyOptional({ description: 'Billing city' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  billingCity?: string;

  @ApiPropertyOptional({ description: 'Billing state/province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  billingState?: string;

  @ApiPropertyOptional({ description: 'Billing postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  billingPostalCode?: string;

  @ApiPropertyOptional({ description: 'Billing country' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  billingCountry?: string;

  @ApiPropertyOptional({ description: 'Shipping address line 1' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  shippingAddressLine1?: string;

  @ApiPropertyOptional({ description: 'Shipping address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  shippingAddressLine2?: string;

  @ApiPropertyOptional({ description: 'Shipping city' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingCity?: string;

  @ApiPropertyOptional({ description: 'Shipping state/province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingState?: string;

  @ApiPropertyOptional({ description: 'Shipping postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  shippingPostalCode?: string;

  @ApiPropertyOptional({ description: 'Shipping country' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingCountry?: string;

  @ApiPropertyOptional({ description: 'Whether the customer is active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
