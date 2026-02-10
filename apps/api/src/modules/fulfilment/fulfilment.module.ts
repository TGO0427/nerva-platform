import { Module } from '@nestjs/common';
import { FulfilmentController } from './fulfilment.controller';
import { FulfilmentService } from './fulfilment.service';
import { FulfilmentRepository } from './fulfilment.repository';
import { PdfService } from './pdf.service';
import { InventoryModule } from '../inventory/inventory.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [InventoryModule, SalesModule],
  controllers: [FulfilmentController],
  providers: [FulfilmentService, FulfilmentRepository, PdfService],
  exports: [FulfilmentService],
})
export class FulfilmentModule {}
