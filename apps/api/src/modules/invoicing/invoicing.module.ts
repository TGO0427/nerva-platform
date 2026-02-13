import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicingService } from './invoicing.service';
import { InvoicingRepository } from './invoicing.repository';
import { InvoicePdfService } from './invoice-pdf.service';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicingService, InvoicingRepository, InvoicePdfService],
  exports: [InvoicingService, InvoicePdfService],
})
export class InvoicingModule {}
