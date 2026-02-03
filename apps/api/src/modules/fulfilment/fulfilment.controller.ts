import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FulfilmentService } from './fulfilment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('fulfilment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('fulfilment')
export class FulfilmentController {
  constructor(private readonly service: FulfilmentService) {}

  // Allocated orders ready for picking
  @Get('allocated-orders')
  @RequirePermissions('pick_wave.create')
  @ApiOperation({ summary: 'Get allocated orders ready for picking' })
  async getAllocatedOrders(@TenantId() tenantId: string) {
    return this.service.getAllocatedOrders(tenantId);
  }

  // Pick Waves
  @Get('pick-waves')
  @RequirePermissions('pick_wave.create')
  @ApiOperation({ summary: 'List pick waves' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listPickWaves(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.service.listPickWaves(tenantId, status, page, limit);
  }

  @Post('pick-waves')
  @RequirePermissions('pick_wave.create')
  @ApiOperation({ summary: 'Create pick wave for orders' })
  async createPickWave(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: { warehouseId: string; orderIds: string[] },
  ) {
    return this.service.createPickWave({
      tenantId,
      ...data,
      createdBy: user.id,
    });
  }

  @Get('pick-waves/:id')
  @RequirePermissions('pick_wave.create')
  @ApiOperation({ summary: 'Get pick wave' })
  async getPickWave(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getPickWave(id);
  }

  @Get('pick-waves/:id/tasks')
  @RequirePermissions('pick_task.execute')
  @ApiOperation({ summary: 'Get pick tasks for wave' })
  async getPickTasks(@Param('id', UuidValidationPipe) waveId: string) {
    return this.service.getPickTasks(waveId);
  }

  @Post('pick-waves/:id/release')
  @RequirePermissions('pick_wave.create')
  @ApiOperation({ summary: 'Release pick wave for execution' })
  async releasePickWave(@Param('id', UuidValidationPipe) id: string) {
    return this.service.releasePickWave(id);
  }

  @Post('pick-waves/:id/complete')
  @RequirePermissions('pick_wave.create')
  @ApiOperation({ summary: 'Complete pick wave' })
  async completePickWave(@Param('id', UuidValidationPipe) id: string) {
    return this.service.completePickWave(id);
  }

  @Post('pick-waves/:id/cancel')
  @RequirePermissions('pick_wave.create')
  @ApiOperation({ summary: 'Cancel pick wave' })
  async cancelPickWave(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: { reason: string },
  ) {
    return this.service.cancelPickWave(id, data.reason);
  }

  // Pick Tasks
  @Get('pick-tasks')
  @RequirePermissions('pick_task.execute')
  @ApiOperation({ summary: 'Get my assigned pick tasks' })
  async getMyTasks(
    @CurrentUser() user: CurrentUserData,
    @Query('status') status?: string,
  ) {
    return this.service.getMyPickTasks(user.id, status);
  }

  @Post('pick-tasks/:id/assign')
  @RequirePermissions('pick_task.execute')
  @ApiOperation({ summary: 'Assign pick task to self' })
  async assignTask(
    @Param('id', UuidValidationPipe) taskId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.assignPickTask(taskId, user.id);
  }

  @Post('pick-tasks/:id/confirm')
  @RequirePermissions('pick_task.execute')
  @ApiOperation({ summary: 'Confirm pick task completion' })
  async confirmTask(
    @Param('id', UuidValidationPipe) taskId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: { qtyPicked: number; shortReason?: string },
  ) {
    return this.service.confirmPickTask(taskId, {
      ...data,
      createdBy: user.id,
    });
  }

  @Post('pick-tasks/:id/cancel')
  @RequirePermissions('pick_task.execute')
  @ApiOperation({ summary: 'Cancel pick task' })
  async cancelTask(
    @Param('id', UuidValidationPipe) taskId: string,
    @Body() data: { reason: string },
  ) {
    return this.service.cancelPickTask(taskId, data.reason);
  }

  // Shipments
  @Get('shipments')
  @RequirePermissions('shipment.read')
  @ApiOperation({ summary: 'List shipments' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listShipments(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.service.listShipments(tenantId, status, page, limit);
  }

  @Post('shipments')
  @RequirePermissions('shipment.create')
  @ApiOperation({ summary: 'Create shipment for order' })
  async createShipment(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: { siteId: string; warehouseId: string; salesOrderId: string },
  ) {
    return this.service.createShipment({
      tenantId,
      ...data,
      createdBy: user.id,
    });
  }

  @Get('shipments/:id')
  @RequirePermissions('shipment.read')
  @ApiOperation({ summary: 'Get shipment' })
  async getShipment(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getShipment(id);
  }

  @Post('shipments/:id/pack')
  @RequirePermissions('shipment.update')
  @ApiOperation({ summary: 'Mark shipment as packed' })
  async packShipment(@Param('id', UuidValidationPipe) id: string) {
    return this.service.packShipment(id);
  }

  @Post('shipments/:id/ready')
  @RequirePermissions('shipment.update')
  @ApiOperation({ summary: 'Mark shipment ready for dispatch' })
  async markShipmentReady(@Param('id', UuidValidationPipe) id: string) {
    return this.service.markShipmentReady(id);
  }

  @Post('shipments/:id/ship')
  @RequirePermissions('shipment.update')
  @ApiOperation({ summary: 'Ship shipment with carrier info' })
  async shipShipment(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: { carrier: string; trackingNo: string },
  ) {
    return this.service.shipShipment(id, data);
  }

  @Post('shipments/:id/deliver')
  @RequirePermissions('shipment.update')
  @ApiOperation({ summary: 'Mark shipment as delivered' })
  async deliverShipment(@Param('id', UuidValidationPipe) id: string) {
    return this.service.deliverShipment(id);
  }

  @Get('orders/:orderId/shipments')
  @RequirePermissions('shipment.read')
  @ApiOperation({ summary: 'Get shipments for order' })
  async getShipmentsByOrder(
    @Param('orderId', UuidValidationPipe) orderId: string,
  ) {
    return this.service.getShipmentsByOrder(orderId);
  }
}
