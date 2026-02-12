import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { CustomersController } from './customers.controller';
import { SuppliersController } from './suppliers.controller';
import { WarehousesController } from './warehouses.controller';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { DashboardController } from './dashboard.controller';
import { ReportsController } from './reports.controller';
import { NotificationsController } from './notifications.controller';
import { MasterDataService } from './masterdata.service';
import { MasterDataRepository } from './masterdata.repository';
import { PurchaseOrderPdfService } from './purchase-order-pdf.service';

@Module({
  controllers: [
    ItemsController,
    CustomersController,
    SuppliersController,
    WarehousesController,
    PurchaseOrdersController,
    DashboardController,
    ReportsController,
    NotificationsController,
  ],
  providers: [MasterDataService, MasterDataRepository, PurchaseOrderPdfService],
  exports: [MasterDataService],
})
export class MasterDataModule {}
