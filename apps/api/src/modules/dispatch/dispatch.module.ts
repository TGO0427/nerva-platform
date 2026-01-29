import { Module } from '@nestjs/common';
import { DispatchController } from './dispatch.controller';
import { DriverController } from './driver.controller';
import { DispatchService } from './dispatch.service';
import { DispatchRepository } from './dispatch.repository';
import { FulfilmentModule } from '../fulfilment/fulfilment.module';

@Module({
  imports: [FulfilmentModule],
  controllers: [DispatchController, DriverController],
  providers: [DispatchService, DispatchRepository],
  exports: [DispatchService],
})
export class DispatchModule {}
