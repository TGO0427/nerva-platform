import { Module } from '@nestjs/common';
import { ReturnsController } from './returns.controller';
import { CreditsController } from './credits.controller';
import { ReturnsService } from './returns.service';
import { ReturnsRepository } from './returns.repository';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [ReturnsController, CreditsController],
  providers: [ReturnsService, ReturnsRepository],
  exports: [ReturnsService],
})
export class ReturnsModule {}
