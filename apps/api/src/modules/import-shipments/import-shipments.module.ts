import { Module } from "@nestjs/common";
import { ImportShipmentsController } from "./import-shipments.controller";
import { ImportShipmentsService } from "./import-shipments.service";
import { ImportShipmentsRepository } from "./import-shipments.repository";

@Module({
  controllers: [ImportShipmentsController],
  providers: [ImportShipmentsService, ImportShipmentsRepository],
  exports: [ImportShipmentsService],
})
export class ImportShipmentsModule {}
