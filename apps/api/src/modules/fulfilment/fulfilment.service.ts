import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FulfilmentRepository, PickWave, PickTask, Shipment } from './fulfilment.repository';
import { StockLedgerService } from '../inventory/stock-ledger.service';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class FulfilmentService {
  constructor(
    private readonly repository: FulfilmentRepository,
    private readonly stockLedger: StockLedgerService,
    private readonly salesService: SalesService,
  ) {}

  // Pick Waves
  async createPickWave(data: {
    tenantId: string;
    warehouseId: string;
    orderIds: string[];
    createdBy?: string;
  }): Promise<PickWave> {
    const waveNo = await this.repository.generateWaveNo(data.tenantId);
    const wave = await this.repository.createPickWave({
      tenantId: data.tenantId,
      warehouseId: data.warehouseId,
      waveNo,
      createdBy: data.createdBy,
    });

    // Create pick tasks for each order
    for (const orderId of data.orderIds) {
      const orderData = await this.salesService.getOrderWithLines(orderId);

      if (orderData.status !== 'ALLOCATED') {
        continue; // Skip non-allocated orders
      }

      for (const line of orderData.lines) {
        if (line.qtyAllocated > line.qtyPicked) {
          const qtyToPick = line.qtyAllocated - line.qtyPicked;

          // Get stock locations
          const stock = await this.stockLedger.getStockOnHand(data.tenantId, line.itemId);
          let remaining = qtyToPick;

          for (const s of stock) {
            if (remaining <= 0) break;
            const pickQty = Math.min(remaining, s.qtyReserved);
            if (pickQty > 0) {
              await this.repository.createPickTask({
                tenantId: data.tenantId,
                pickWaveId: wave.id,
                salesOrderId: orderId,
                salesOrderLineId: line.id,
                itemId: line.itemId,
                fromBinId: s.binId,
                qtyToPick: pickQty,
                batchNo: s.batchNo || undefined,
              });
              remaining -= pickQty;
            }
          }
        }
      }
    }

    return wave;
  }

  async getPickWave(id: string): Promise<PickWave> {
    const wave = await this.repository.findPickWaveById(id);
    if (!wave) throw new NotFoundException('Pick wave not found');
    return wave;
  }

  async getPickTasks(waveId: string): Promise<PickTask[]> {
    return this.repository.findPickTasksByWave(waveId);
  }

  async getMyPickTasks(userId: string, status?: string): Promise<PickTask[]> {
    return this.repository.findPickTasksByAssignee(userId, status);
  }

  async assignPickTask(taskId: string, userId: string): Promise<PickTask> {
    const task = await this.repository.assignPickTask(taskId, userId);
    if (!task) throw new NotFoundException('Pick task not found');
    return task;
  }

  async confirmPickTask(
    taskId: string,
    data: { qtyPicked: number; shortReason?: string; createdBy?: string },
  ): Promise<PickTask> {
    const task = await this.repository.findPickTaskById(taskId);
    if (!task) throw new NotFoundException('Pick task not found');

    if (task.status === 'PICKED' || task.status === 'CANCELLED') {
      throw new BadRequestException('Task already completed');
    }

    // Record stock movement
    await this.stockLedger.recordMovement({
      tenantId: task.tenantId,
      itemId: task.itemId,
      fromBinId: task.fromBinId,
      qty: data.qtyPicked,
      reason: 'PICK',
      refType: 'pick_task',
      refId: taskId,
      batchNo: task.batchNo || undefined,
      createdBy: data.createdBy,
    });

    // Release reservation
    await this.stockLedger.releaseReservation(
      task.tenantId,
      task.fromBinId,
      task.itemId,
      task.qtyToPick,
      task.batchNo || undefined,
    );

    const updated = await this.repository.confirmPickTask(
      taskId,
      data.qtyPicked,
      data.shortReason,
    );

    return updated!;
  }

  // Shipments
  async createShipment(data: {
    tenantId: string;
    siteId: string;
    warehouseId: string;
    salesOrderId: string;
    createdBy?: string;
  }): Promise<Shipment> {
    const shipmentNo = await this.repository.generateShipmentNo(data.tenantId);
    return this.repository.createShipment({ ...data, shipmentNo });
  }

  async getShipment(id: string): Promise<Shipment> {
    const shipment = await this.repository.findShipmentById(id);
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  async listShipments(tenantId: string, status?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const shipments = await this.repository.findShipmentsByTenant(tenantId, status, limit, offset);
    return { data: shipments, meta: { page, limit } };
  }

  async markShipmentReady(id: string): Promise<Shipment> {
    const shipment = await this.getShipment(id);
    if (shipment.status !== 'PACKED') {
      throw new BadRequestException('Shipment must be packed before marking ready');
    }
    const updated = await this.repository.updateShipmentStatus(id, 'READY_FOR_DISPATCH');
    return updated!;
  }

  // List pick waves
  async listPickWaves(tenantId: string, status?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [waves, total] = await Promise.all([
      this.repository.findPickWavesByTenant(tenantId, status, limit, offset),
      this.repository.countPickWavesByTenant(tenantId, status),
    ]);
    return {
      data: waves,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Release wave for execution
  async releasePickWave(id: string): Promise<PickWave> {
    const wave = await this.getPickWave(id);
    if (wave.status !== 'PENDING') {
      throw new BadRequestException('Wave must be in PENDING status to release');
    }
    const updated = await this.repository.updatePickWaveStatus(id, 'IN_PROGRESS');
    return updated!;
  }

  // Complete pick wave
  async completePickWave(id: string): Promise<PickWave> {
    const wave = await this.getPickWave(id);
    if (wave.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Wave must be in progress to complete');
    }

    const allComplete = await this.repository.areAllTasksComplete(id);
    if (!allComplete) {
      throw new BadRequestException('Cannot complete wave while tasks are still pending');
    }

    const updated = await this.repository.updatePickWaveStatus(id, 'COMPLETE');
    return updated!;
  }

  // Cancel pick wave
  async cancelPickWave(id: string, reason: string): Promise<PickWave> {
    const wave = await this.getPickWave(id);
    if (wave.status === 'COMPLETE') {
      throw new BadRequestException('Cannot cancel a completed wave');
    }

    // Cancel all pending tasks
    const tasks = await this.getPickTasks(id);
    for (const task of tasks) {
      if (task.status !== 'PICKED' && task.status !== 'CANCELLED') {
        await this.repository.cancelPickTask(task.id, reason);
      }
    }

    const updated = await this.repository.updatePickWaveStatus(id, 'CANCELLED');
    return updated!;
  }

  // Cancel single pick task
  async cancelPickTask(taskId: string, reason: string): Promise<PickTask> {
    const task = await this.repository.findPickTaskById(taskId);
    if (!task) throw new NotFoundException('Pick task not found');

    if (task.status === 'PICKED') {
      throw new BadRequestException('Cannot cancel a completed task');
    }

    // Release reservation if any
    if (task.reservationId) {
      await this.stockLedger.releaseReservation(
        task.tenantId,
        task.fromBinId,
        task.itemId,
        task.qtyToPick,
        task.batchNo || undefined,
      );
    }

    const cancelled = await this.repository.cancelPickTask(taskId, reason);
    return cancelled!;
  }

  // Pack shipment
  async packShipment(id: string): Promise<Shipment> {
    const shipment = await this.getShipment(id);
    if (shipment.status !== 'PENDING') {
      throw new BadRequestException('Shipment must be in PENDING status to pack');
    }
    const updated = await this.repository.updateShipmentStatus(id, 'PACKED');
    return updated!;
  }

  // Ship the shipment with carrier info
  async shipShipment(
    id: string,
    data: { carrier: string; trackingNo: string },
  ): Promise<Shipment> {
    const shipment = await this.getShipment(id);
    if (shipment.status !== 'READY_FOR_DISPATCH' && shipment.status !== 'PACKED') {
      throw new BadRequestException('Shipment must be ready for dispatch');
    }

    const updated = await this.repository.updateShipmentCarrier(
      id,
      data.carrier,
      data.trackingNo,
    );
    return updated!;
  }

  // Mark shipment as delivered
  async deliverShipment(id: string): Promise<Shipment> {
    const shipment = await this.getShipment(id);
    if (shipment.status !== 'SHIPPED') {
      throw new BadRequestException('Shipment must be shipped before delivery');
    }
    const updated = await this.repository.updateShipmentStatus(id, 'DELIVERED');
    return updated!;
  }

  // Get shipments for an order
  async getShipmentsByOrder(salesOrderId: string): Promise<Shipment[]> {
    return this.repository.findShipmentsByOrder(salesOrderId);
  }
}
