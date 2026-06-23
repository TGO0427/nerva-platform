import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { TenantId } from "../../common/decorators/tenant.decorator";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateDocumentDto, ListDocumentsQueryDto } from "./dto/document.dto";
import { DocumentsService } from "./documents.service";

@ApiTags("documents")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @RequirePermissions("document.read")
  @ApiOperation({ summary: "List compliance documents" })
  async list(
    @TenantId() tenantId: string,
    @Query() query: ListDocumentsQueryDto,
  ) {
    return this.service.list(tenantId, query);
  }

  @Get("stats")
  @RequirePermissions("document.read")
  @ApiOperation({ summary: "Get document centre status counts" })
  async stats(@TenantId() tenantId: string) {
    return this.service.stats(tenantId);
  }

  @Post()
  @RequirePermissions("document.write")
  @ApiOperation({ summary: "Create compliance document metadata" })
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() data: CreateDocumentDto,
  ) {
    return this.service.create(tenantId, user.id, data);
  }
}
