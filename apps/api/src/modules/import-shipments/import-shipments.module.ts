import { Module, forwardRef } from "@nestjs/common";
import { ImportShipmentsController } from "./import-shipments.controller";
import { ImportShipmentsService } from "./import-shipments.service";
import { ImportShipmentsRepository } from "./import-shipments.repository";
import { InventoryModule } from "../inventory/inventory.module";

@Module({
  imports: [forwardRef(() => InventoryModule)],
  controllers: [ImportShipmentsController],
  providers: [ImportShipmentsService, ImportShipmentsRepository],
  exports: [ImportShipmentsService],
})
export class ImportShipmentsModule {}
