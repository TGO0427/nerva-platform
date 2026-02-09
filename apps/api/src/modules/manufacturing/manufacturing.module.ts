import { Module } from '@nestjs/common';
import { ManufacturingController } from './manufacturing.controller';
import { ManufacturingService } from './manufacturing.service';
import { WorkstationRepository } from './repositories/workstation.repository';
import { BomRepository } from './repositories/bom.repository';
import { RoutingRepository } from './repositories/routing.repository';
import { WorkOrderRepository } from './repositories/work-order.repository';
import { ProductionLedgerRepository } from './repositories/production-ledger.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { MasterDataModule } from '../masterdata/masterdata.module';

@Module({
  imports: [InventoryModule, MasterDataModule],
  controllers: [ManufacturingController],
  providers: [
    ManufacturingService,
    WorkstationRepository,
    BomRepository,
    RoutingRepository,
    WorkOrderRepository,
    ProductionLedgerRepository,
  ],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}
