import { Module, forwardRef } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { GrnController } from './grn.controller';
import { AdjustmentsController } from './adjustments.controller';
import { CycleCountController } from './cycle-count.controller';
import { PutawayController } from './putaway.controller';
import { IbtController } from './ibt.controller';
import { InventoryService } from './inventory.service';
import { IbtService } from './ibt.service';
import { StockLedgerService } from './stock-ledger.service';
import { InventoryRepository } from './inventory.repository';
import { BatchRepository } from './batch.repository';
import { CycleCountRepository } from './cycle-count.repository';
import { PutawayRepository } from './putaway.repository';
import { IbtRepository } from './ibt.repository';
import { MasterDataModule } from '../masterdata/masterdata.module';

@Module({
  imports: [forwardRef(() => MasterDataModule)],
  controllers: [InventoryController, GrnController, AdjustmentsController, CycleCountController, PutawayController, IbtController],
  providers: [InventoryService, IbtService, StockLedgerService, InventoryRepository, BatchRepository, CycleCountRepository, PutawayRepository, IbtRepository],
  exports: [InventoryService, StockLedgerService, BatchRepository],
})
export class InventoryModule {}
