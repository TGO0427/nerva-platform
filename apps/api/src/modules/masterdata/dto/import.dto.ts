import { Type } from 'class-transformer';
import { ValidateNested, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateItemDto } from './create-item.dto';
import { CreateCustomerDto } from './create-customer.dto';
import { CreateSupplierDto } from './create-supplier.dto';

export class ImportItemsDto {
  @ApiProperty({ type: [CreateItemDto], description: 'Array of items to import (max 500)' })
  @ValidateNested({ each: true })
  @Type(() => CreateItemDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  items: CreateItemDto[];
}

export class ImportCustomersDto {
  @ApiProperty({ type: [CreateCustomerDto], description: 'Array of customers to import (max 500)' })
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  customers: CreateCustomerDto[];
}

export class ImportSuppliersDto {
  @ApiProperty({ type: [CreateSupplierDto], description: 'Array of suppliers to import (max 500)' })
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  suppliers: CreateSupplierDto[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  skippedCodes: string[];
}
