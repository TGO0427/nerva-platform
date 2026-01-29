import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { CustomersController } from './customers.controller';
import { SuppliersController } from './suppliers.controller';
import { WarehousesController } from './warehouses.controller';
import { MasterDataService } from './masterdata.service';
import { MasterDataRepository } from './masterdata.repository';

@Module({
  controllers: [
    ItemsController,
    CustomersController,
    SuppliersController,
    WarehousesController,
  ],
  providers: [MasterDataService, MasterDataRepository],
  exports: [MasterDataService],
})
export class MasterDataModule {}
