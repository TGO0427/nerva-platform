import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesRepository } from './sales.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { MasterDataModule } from '../masterdata/masterdata.module';

@Module({
  imports: [InventoryModule, MasterDataModule],
  controllers: [SalesController],
  providers: [SalesService, SalesRepository],
  exports: [SalesService],
})
export class SalesModule {}
