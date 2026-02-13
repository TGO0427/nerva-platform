import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { PortalRepository } from './portal.repository';
import { InvoicingModule } from '../invoicing/invoicing.module';

@Module({
  imports: [InvoicingModule],
  controllers: [PortalController],
  providers: [PortalService, PortalRepository],
})
export class PortalModule {}
