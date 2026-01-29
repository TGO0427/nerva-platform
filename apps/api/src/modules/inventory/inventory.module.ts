import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { GrnController } from './grn.controller';
import { AdjustmentsController } from './adjustments.controller';
import { InventoryService } from './inventory.service';
import { StockLedgerService } from './stock-ledger.service';
import { InventoryRepository } from './inventory.repository';

@Module({
  controllers: [InventoryController, GrnController, AdjustmentsController],
  providers: [InventoryService, StockLedgerService, InventoryRepository],
  exports: [InventoryService, StockLedgerService],
})
export class InventoryModule {}
