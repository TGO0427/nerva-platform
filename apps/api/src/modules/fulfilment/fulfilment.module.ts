import { Module } from '@nestjs/common';
import { FulfilmentController } from './fulfilment.controller';
import { FulfilmentService } from './fulfilment.service';
import { FulfilmentRepository } from './fulfilment.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [InventoryModule, SalesModule],
  controllers: [FulfilmentController],
  providers: [FulfilmentService, FulfilmentRepository],
  exports: [FulfilmentService],
})
export class FulfilmentModule {}
