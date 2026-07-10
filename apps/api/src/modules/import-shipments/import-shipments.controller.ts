import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ImportShipmentsService } from "./import-shipments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { TenantId, SiteId } from "../../common/decorators/tenant.decorator";
import {
  CurrentUser,
  CurrentUserData,
} from "../../common/decorators/current-user.decorator";
import { UuidValidationPipe } from "../../common/pipes/uuid-validation.pipe";
import {
  CreateImportShipmentDto,
  UpdateImportShipmentDto,
  UpdateImportShipmentStatusDto,
} from "./dto/import-shipments.dto";

@ApiTags("import-shipments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller("import-shipments")
export class ImportShipmentsController {
  constructor(private readonly service: ImportShipmentsService) {}

  @Get()
  @RequirePermissions("import_shipment.read")
  @ApiOperation({ summary: "List import shipments" })
  async list(
    @TenantId() tenantId: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.service.list(tenantId, { status, search }, page, limit);
  }

  @Get(":id")
  @RequirePermissions("import_shipment.read")
  @ApiOperation({ summary: "Get import shipment" })
  async get(@Param("id", UuidValidationPipe) id: string) {
    return this.service.get(id);
  }

  @Post()
  @RequirePermissions("import_shipment.write")
  @ApiOperation({ summary: "Create import shipment" })
  async create(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: CreateImportShipmentDto,
  ) {
    return this.service.create({
      tenantId,
      siteId: data.siteId ?? siteId,
      ...data,
      createdBy: user.id,
    });
  }

  @Patch(":id")
  @RequirePermissions("import_shipment.write")
  @ApiOperation({ summary: "Update import shipment" })
  async update(
    @Param("id", UuidValidationPipe) id: string,
    @Body() data: UpdateImportShipmentDto,
  ) {
    return this.service.update(id, data);
  }

  @Patch(":id/status")
  @RequirePermissions("import_shipment.write")
  @ApiOperation({ summary: "Update import shipment status" })
  async updateStatus(
    @Param("id", UuidValidationPipe) id: string,
    @Body() data: UpdateImportShipmentStatusDto,
  ) {
    return this.service.updateStatus(id, data.status);
  }

  @Delete(":id")
  @RequirePermissions("import_shipment.write")
  @ApiOperation({ summary: "Delete import shipment" })
  async delete(@Param("id", UuidValidationPipe) id: string) {
    await this.service.delete(id);
    return { success: true };
  }
}
