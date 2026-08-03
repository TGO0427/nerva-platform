import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { IbtService } from "./ibt.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { TenantId } from "../../common/decorators/tenant.decorator";
import {
  CurrentUser,
  CurrentUserData,
} from "../../common/decorators/current-user.decorator";
import { UuidValidationPipe } from "../../common/pipes/uuid-validation.pipe";
import {
  CreateIbtDto,
  AddIbtLineDto,
  ShipIbtDto,
  ReceiveIbtDto,
} from "./dto/ibt.dto";

@ApiTags("inventory")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller("inventory/ibts")
export class IbtController {
  constructor(private readonly ibtService: IbtService) {}

  @Get()
  @RequirePermissions("ibt.create")
  @ApiOperation({ summary: "List IBTs" })
  async list(
    @TenantId() tenantId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("fromWarehouseId") fromWarehouseId?: string,
    @Query("toWarehouseId") toWarehouseId?: string,
  ) {
    return this.ibtService.listIbts(
      tenantId,
      { status, fromWarehouseId, toWarehouseId },
      parseInt(page || "1", 10),
      parseInt(limit || "25", 10),
    );
  }

  @Post()
  @RequirePermissions("ibt.create")
  @ApiOperation({ summary: "Create IBT" })
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: CreateIbtDto,
  ) {
    return this.ibtService.createIbt({
      tenantId,
      ...data,
      createdBy: user.id,
    });
  }

  @Get(":id")
  @RequirePermissions("ibt.create")
  @ApiOperation({ summary: "Get IBT by ID" })
  async get(
    @TenantId() tenantId: string,
    @Param("id", UuidValidationPipe) id: string,
  ) {
    return this.ibtService.getIbt(tenantId, id);
  }

  @Get(":id/lines")
  @RequirePermissions("ibt.create")
  @ApiOperation({ summary: "Get IBT lines" })
  async getLines(
    @TenantId() tenantId: string,
    @Param("id", UuidValidationPipe) id: string,
  ) {
    return this.ibtService.getLines(tenantId, id);
  }

  @Post(":id/lines")
  @RequirePermissions("ibt.create")
  @ApiOperation({ summary: "Add line to IBT" })
  async addLine(
    @TenantId() tenantId: string,
    @Param("id", UuidValidationPipe) id: string,
    @Body() data: AddIbtLineDto,
  ) {
    return this.ibtService.addLine(id, { tenantId, ...data });
  }

  @Delete(":id/lines/:lineId")
  @RequirePermissions("ibt.create")
  @ApiOperation({ summary: "Remove line from IBT" })
  async removeLine(
    @TenantId() tenantId: string,
    @Param("id", UuidValidationPipe) id: string,
    @Param("lineId", UuidValidationPipe) lineId: string,
  ) {
    await this.ibtService.removeLine(tenantId, id, lineId);
    return { success: true };
  }

  @Post(":id/submit")
  @RequirePermissions("ibt.create")
  @ApiOperation({ summary: "Submit IBT for approval" })
  async submit(
    @TenantId() tenantId: string,
    @Param("id", UuidValidationPipe) id: string,
  ) {
    return this.ibtService.submitForApproval(tenantId, id);
  }

  @Post(":id/approve")
  @RequirePermissions("ibt.approve")
  @ApiOperation({ summary: "Approve IBT" })
  async approve(
    @TenantId() tenantId: string,
    @Param("id", UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.ibtService.approve(tenantId, id, user.id);
  }

  @Post(":id/start-picking")
  @RequirePermissions("ibt.create")
  @ApiOperation({ summary: "Start picking for IBT" })
  async startPicking(
    @TenantId() tenantId: string,
    @Param("id", UuidValidationPipe) id: string,
  ) {
    return this.ibtService.startPicking(tenantId, id);
  }

  @Post(":id/ship")
  @RequirePermissions("ibt.create")
  @ApiOperation({ summary: "Ship IBT lines" })
  async ship(
    @TenantId() tenantId: string,
    @Param("id", UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: ShipIbtDto,
  ) {
    return this.ibtService.shipLines(tenantId, id, data.lines, user.id);
  }

  @Post(":id/receive")
  @RequirePermissions("ibt.create")
  @ApiOperation({ summary: "Receive IBT lines" })
  async receive(
    @TenantId() tenantId: string,
    @Param("id", UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: ReceiveIbtDto,
  ) {
    return this.ibtService.receiveLines(tenantId, id, data.lines, user.id);
  }

  @Post(":id/cancel")
  @RequirePermissions("ibt.create")
  @ApiOperation({ summary: "Cancel IBT" })
  async cancel(
    @TenantId() tenantId: string,
    @Param("id", UuidValidationPipe) id: string,
  ) {
    return this.ibtService.cancel(tenantId, id);
  }

  @Delete(":id")
  @RequirePermissions("ibt.delete")
  @ApiOperation({ summary: "Delete IBT (draft only)" })
  async deleteIbt(
    @TenantId() tenantId: string,
    @Param("id", UuidValidationPipe) id: string,
  ) {
    await this.ibtService.deleteIbt(tenantId, id);
    return { success: true };
  }
}
