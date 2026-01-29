import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { IntegrationsRepository } from './integrations.repository';
import { PostingQueueService } from './posting-queue.service';

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService, IntegrationsRepository, PostingQueueService],
  exports: [IntegrationsService, PostingQueueService],
})
export class IntegrationsModule {}
