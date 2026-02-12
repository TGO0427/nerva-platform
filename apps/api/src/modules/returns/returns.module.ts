import { Module } from '@nestjs/common';
import { ReturnsController } from './returns.controller';
import { CreditsController } from './credits.controller';
import { ReturnsService } from './returns.service';
import { ReturnsRepository } from './returns.repository';
import { RmaPdfService } from './rma-pdf.service';
import { CreditNotePdfService } from './credit-note-pdf.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [ReturnsController, CreditsController],
  providers: [ReturnsService, ReturnsRepository, RmaPdfService, CreditNotePdfService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
