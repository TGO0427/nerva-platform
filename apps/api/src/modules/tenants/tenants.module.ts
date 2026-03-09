import { Module } from "@nestjs/common";
import { TenantsController } from "./tenants.controller";
import { TenantsService } from "./tenants.service";
import { TenantsRepository } from "./tenants.repository";
import { UsersModule } from "../users/users.module";
import { RbacModule } from "../rbac/rbac.module";

@Module({
  imports: [UsersModule, RbacModule],
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository],
  exports: [TenantsService],
})
export class TenantsModule {}
