import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  FulfilmentRepository,
  PickWave,
  PickTask,
  Shipment,
  ShipmentLine,
  ShippableOrder,
} from "./fulfilment.repository";
import { StockLedgerService } from "../inventory/stock-ledger.service";
import { SalesService } from "../sales/sales.service";
import { buildPaginatedResult } from "../../common/utils/pagination";

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
  }): Promise<PickWave & { warnings: { orderId: string; orderNo: string; reason: string }[] }> {
    const waveNo = await this.repository.generateWaveNo(data.tenantId);
    const wave = await this.repository.createPickWave({
      tenantId: data.tenantId,
      warehouseId: data.warehouseId,
      waveNo,
      createdBy: data.createdBy,
    });

    const warnings: { orderId: string; orderNo: string; reason: string }[] = [];

    // Create pick tasks for each order
    for (const orderId of data.orderIds) {
      const orderData = await this.salesService.getOrderWithLines(data.tenantId, orderId);

      if (orderData.status !== "ALLOCATED") {
        warnings.push({
          orderId,
          orderNo: orderData.orderNo,
          reason: "Order is not allocated — no pick tasks were created",
        });
        continue; // Skip non-allocated orders
      }

      let orderShort = false;
      let tasksCreated = 0;

      for (const line of orderData.lines) {
        if (line.qtyAllocated > line.qtyPicked) {
          // Consume exactly what was reserved for this line at allocation
          // time, rather than independently re-deriving FEFO from whatever
          // stock happens to remain now — the two can silently diverge if
          // stock moved in between.
          const reservations = await this.salesService.getReservationsForOrderLine(
            data.tenantId,
            line.id,
          );

          if (reservations.length > 0) {
            for (const r of reservations) {
              await this.repository.createPickTask({
                tenantId: data.tenantId,
                pickWaveId: wave.id,
                salesOrderId: orderId,
                salesOrderLineId: line.id,
                itemId: line.itemId,
                fromBinId: r.binId,
                qtyToPick: r.qty,
                batchNo: r.batchNo || undefined,
                reservationId: r.id,
              });
              await this.salesService.markReservationPicked(r.id);
              tasksCreated++;
            }
            continue;
          }

          // No traceable reservation for this line — it was allocated
          // before stock_reservations existed, so there's nothing durable
          // to consume. Fall back to the pre-reservation behavior (derive
          // directly from current on-hand stock) rather than leaving the
          // line stranded with zero pick tasks forever.
          console.warn(
            `No stock reservation found for order line ${line.id} — falling back to on-hand stock`,
          );
          const qtyToPick = line.qtyAllocated - line.qtyPicked;
          const stock = await this.stockLedger.getStockOnHand(data.tenantId, line.itemId);
          let remaining = qtyToPick;
          for (const s of stock) {
            if (remaining <= 0) break;
            const pickQty = Math.min(remaining, s.qtyOnHand);
            if (pickQty <= 0) continue;
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
            tasksCreated++;
          }
          if (remaining > 0) {
            orderShort = true;
            console.warn(
              `Insufficient on-hand stock for order line ${line.id}: short by ${remaining}`,
            );
          }
        }
      }

      if (orderShort) {
        warnings.push({
          orderId,
          orderNo: orderData.orderNo,
          reason: "Insufficient on-hand stock to cover some line(s) — this order was allocated before stock reservations existed, so availability could not be re-verified",
        });
      }

      if (tasksCreated === 0) {
        warnings.push({
          orderId,
          orderNo: orderData.orderNo,
          reason: "No pick tasks could be created for this order — it stays ALLOCATED",
        });
        continue;
      }

      // Update order status to PICKING
      await this.salesService.updateOrderStatus(data.tenantId, orderId, "PICKING");
    }

    return { ...wave, warnings };
  }

  // Get allocated orders ready for picking
  async getAllocatedOrders(tenantId: string) {
    return this.salesService.listOrders(
      tenantId,
      { status: "ALLOCATED" },
      1,
      100,
    );
  }

  async getPickWave(id: string): Promise<PickWave> {
    const wave = await this.repository.findPickWaveById(id);
    if (!wave) throw new NotFoundException("Pick wave not found");
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
    if (!task) throw new NotFoundException("Pick task not found");
    return task;
  }

  async confirmPickTask(
    taskId: string,
    data: { qtyPicked: number; shortReason?: string; createdBy?: string },
  ): Promise<PickTask> {
    const task = await this.repository.findPickTaskById(taskId);
    if (!task) throw new NotFoundException("Pick task not found");

    if (task.status === "PICKED" || task.status === "CANCELLED") {
      throw new BadRequestException("Task already completed");
    }

    // Record stock movement
    await this.stockLedger.recordMovement({
      tenantId: task.tenantId,
      itemId: task.itemId,
      fromBinId: task.fromBinId,
      qty: data.qtyPicked,
      reason: "PICK",
      refType: "pick_task",
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

    // pick_tasks.qty_picked is an absolute total for the task (a SHORT
    // task can be re-confirmed later with a higher cumulative amount), so
    // the sales order line only needs the delta from whatever this task
    // had already contributed before this call.
    const delta = data.qtyPicked - task.qtyPicked;
    if (delta !== 0) {
      await this.salesService.incrementOrderLineQty(
        task.salesOrderLineId,
        "qty_picked",
        delta,
      );
    }
    await this.salesService.tryAdvanceToPicked(task.tenantId, task.salesOrderId);

    return updated!;
  }

  // Shipments
  async createShipment(data: {
    tenantId: string;
    siteId?: string;
    warehouseId?: string;
    salesOrderId: string;
    createdBy?: string;
  }): Promise<Shipment> {
    // Lookup order to get siteId/warehouseId if not provided
    const order = await this.salesService.getOrder(data.tenantId, data.salesOrderId);
    if (order.status !== "PICKED") {
      throw new BadRequestException(
        "Order must be fully picked (status PICKED) before a shipment can be created",
      );
    }
    const siteId = data.siteId || order.siteId;
    const warehouseId = data.warehouseId || order.warehouseId;

    // Create shipment header
    const shipmentNo = await this.repository.generateShipmentNo(data.tenantId);
    const shipment = await this.repository.createShipment({
      tenantId: data.tenantId,
      siteId,
      warehouseId,
      salesOrderId: data.salesOrderId,
      shipmentNo,
      createdBy: data.createdBy,
    });

    // Get order lines and create shipment lines from picked quantities
    const orderData = await this.salesService.getOrderWithLines(
      data.tenantId,
      data.salesOrderId,
    );
    for (const line of orderData.lines) {
      if (line.qtyPicked > 0) {
        // Get picked batches for this order line
        const pickedBatches =
          await this.repository.findPickedBatchesByOrderLine(line.id);

        if (pickedBatches.length > 0) {
          // Create a shipment line per batch
          for (const batch of pickedBatches) {
            if (batch.qtyPicked > 0) {
              await this.repository.createShipmentLine({
                tenantId: data.tenantId,
                shipmentId: shipment.id,
                salesOrderLineId: line.id,
                itemId: line.itemId,
                qty: batch.qtyPicked,
                batchNo: batch.batchNo || undefined,
              });
            }
          }
        } else {
          // No batch tracking - create single line
          await this.repository.createShipmentLine({
            tenantId: data.tenantId,
            shipmentId: shipment.id,
            salesOrderLineId: line.id,
            itemId: line.itemId,
            qty: line.qtyPicked,
          });
        }
      }
    }

    // Calculate and update weight
    const totalWeight = await this.repository.sumShipmentWeight(shipment.id);
    if (totalWeight > 0) {
      await this.repository.updateShipmentWeight(shipment.id, totalWeight);
    }

    await this.advanceOrderStatus(data.tenantId, data.salesOrderId, "PACKING");

    // Return fresh shipment with weight
    return this.repository.findShipmentById(shipment.id) as Promise<Shipment>;
  }

  /**
   * Cascade a shipment-driven event to the sales order's own status.
   * Best-effort: the shipment/stock side effect that triggered this has
   * already happened by the time this runs, so a status-transition
   * mismatch here (e.g. some other flow already moved the order on)
   * shouldn't roll back or block the real action.
   */
  private async advanceOrderStatus(
    tenantId: string,
    salesOrderId: string,
    status: string,
  ): Promise<void> {
    try {
      await this.salesService.updateOrderStatus(tenantId, salesOrderId, status);
    } catch (error) {
      console.warn(
        `Failed to advance order ${salesOrderId} to ${status}:`,
        error,
      );
    }
  }

  async getShipmentLines(shipmentId: string): Promise<ShipmentLine[]> {
    return this.repository.findShipmentLinesByShipment(shipmentId);
  }

  async getShipmentQualityBlockers(shipmentId: string) {
    return this.repository.findBlockedBatchesByShipment(shipmentId);
  }

  async getShippableOrders(tenantId: string): Promise<ShippableOrder[]> {
    return this.repository.findShippableOrders(tenantId);
  }

  async getShipment(id: string): Promise<Shipment> {
    const shipment = await this.repository.findShipmentById(id);
    if (!shipment) throw new NotFoundException("Shipment not found");
    return shipment;
  }

  async listShipments(tenantId: string, status?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repository.findShipmentsByTenant(tenantId, status, limit, offset),
      this.repository.countShipmentsByTenant(tenantId, status),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async markShipmentReady(id: string): Promise<Shipment> {
    const shipment = await this.getShipment(id);
    if (shipment.status !== "PACKED") {
      throw new BadRequestException(
        "Shipment must be packed before marking ready",
      );
    }
    const updated = await this.repository.updateShipmentStatus(
      id,
      "READY_FOR_DISPATCH",
    );
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
    if (wave.status !== "OPEN") {
      throw new BadRequestException("Wave must be in OPEN status to release");
    }
    const tasks = await this.repository.findPickTasksByWave(id);
    if (tasks.length === 0) {
      throw new BadRequestException(
        "Cannot release an empty wave — no pick tasks were created for the selected order(s). Cancel it and check the order's allocation.",
      );
    }
    const missingBatch = await this.repository.findTasksMissingRequiredBatch(id);
    if (missingBatch.length > 0) {
      throw new BadRequestException(
        `Cannot release wave — batch-tracked item(s) have no batch assigned: ${missingBatch.map((m) => m.itemSku).join(", ")}`,
      );
    }
    const updated = await this.repository.updatePickWaveStatus(
      id,
      "IN_PROGRESS",
    );
    return updated!;
  }

  // Complete pick wave
  async completePickWave(id: string): Promise<PickWave> {
    const wave = await this.getPickWave(id);
    if (wave.status !== "IN_PROGRESS") {
      throw new BadRequestException("Wave must be in progress to complete");
    }

    const allComplete = await this.repository.areAllTasksComplete(id);
    if (!allComplete) {
      throw new BadRequestException(
        "Cannot complete wave while tasks are still pending",
      );
    }

    const updated = await this.repository.updatePickWaveStatus(id, "COMPLETE");
    return updated!;
  }

  // Cancel pick wave
  async cancelPickWave(id: string, reason: string): Promise<PickWave> {
    const wave = await this.getPickWave(id);
    if (wave.status === "COMPLETE") {
      throw new BadRequestException("Cannot cancel a completed wave");
    }

    // A PICKED (or SHORT - a partial pick still moves real stock) task
    // already moved real stock out of its bin - that's physical warehouse
    // work that happened, not something safe to silently reverse as a
    // side effect of cancelling the wave. Block and name exactly what's
    // blocking it, so the user resolves it explicitly (ship it, or
    // reverse that one task) before cancelling.
    const tasks = await this.getPickTasks(id);
    const pickedTasks = tasks.filter((t) => t.status === "PICKED" || t.status === "SHORT");
    if (pickedTasks.length > 0) {
      const items = pickedTasks
        .map((t) => `${t.itemSku || t.itemId}${t.batchNo ? ` (${t.batchNo})` : ""}`)
        .join(", ");
      throw new BadRequestException(
        `Cannot cancel: ${pickedTasks.length} task(s) already picked -- ${items}. Ship this stock or reverse the pick before cancelling the wave.`,
      );
    }

    for (const task of tasks) {
      if (task.status !== "CANCELLED") {
        await this.repository.cancelPickTask(task.id, reason);
      }
    }

    const updated = await this.repository.updatePickWaveStatus(id, "CANCELLED");
    return updated!;
  }

  // Reopen completed or cancelled pick wave
  async reopenPickWave(id: string): Promise<PickWave> {
    const wave = await this.getPickWave(id);
    if (!["COMPLETE", "CANCELLED"].includes(wave.status)) {
      throw new BadRequestException(
        "Only completed or cancelled pick waves can be reopened",
      );
    }

    const newStatus = wave.status === "CANCELLED" ? "OPEN" : "IN_PROGRESS";
    const updated = await this.repository.updatePickWaveStatus(id, newStatus);
    return updated!;
  }

  // Cancel single pick task
  async cancelPickTask(taskId: string, reason: string): Promise<PickTask> {
    const task = await this.repository.findPickTaskById(taskId);
    if (!task) throw new NotFoundException("Pick task not found");

    if (task.status === "PICKED" || task.status === "SHORT") {
      throw new BadRequestException(
        "Cannot cancel a task that has already been picked - reverse the pick instead",
      );
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
      await this.salesService.markReservationUnpicked(task.reservationId);
    }

    const cancelled = await this.repository.cancelPickTask(taskId, reason);
    return cancelled!;
  }

  // Undo an already-picked (or short-picked) task: put the physically
  // picked stock back into its bin and re-reserve it for the order line,
  // since the pick itself is being retracted, not the order's claim on
  // that stock. Once reversed, cancelOrder's normal RESERVED-release path
  // can clean it up if the order itself gets cancelled next.
  async reversePickTask(
    taskId: string,
    reason: string,
    createdBy?: string,
  ): Promise<PickTask> {
    const task = await this.repository.findPickTaskById(taskId);
    if (!task) throw new NotFoundException("Pick task not found");

    if (task.status !== "PICKED" && task.status !== "SHORT") {
      throw new BadRequestException("Only a picked task can be reversed");
    }

    await this.stockLedger.recordMovement({
      tenantId: task.tenantId,
      itemId: task.itemId,
      toBinId: task.fromBinId,
      qty: task.qtyPicked,
      reason: "PICK_REVERSAL",
      refType: "pick_task",
      refId: task.id,
      batchNo: task.batchNo || undefined,
      createdBy,
    });

    await this.stockLedger.reserveStockWithBatch(
      task.tenantId,
      task.fromBinId,
      task.itemId,
      task.qtyPicked,
      task.batchNo,
      null,
    );

    if (task.reservationId) {
      await this.salesService.markReservationUnpicked(task.reservationId);
    }
    if (task.qtyPicked > 0) {
      await this.salesService.incrementOrderLineQty(
        task.salesOrderLineId,
        "qty_picked",
        -task.qtyPicked,
      );
    }

    const reversed = await this.repository.reversePickTask(taskId, reason);
    return reversed!;
  }

  // Pack shipment
  async packShipment(id: string): Promise<Shipment> {
    const shipment = await this.getShipment(id);
    if (shipment.status !== "PENDING") {
      throw new BadRequestException(
        "Shipment must be in PENDING status to pack",
      );
    }
    const updated = await this.repository.updateShipmentStatus(id, "PACKED");
    await this.applyShipmentLineQtyToOrderLines(id, "qty_packed");
    await this.advanceOrderStatus(shipment.tenantId, shipment.salesOrderId, "PACKED");
    return updated!;
  }

  // Ship the shipment with carrier info
  async shipShipment(
    id: string,
    data: { carrier: string; trackingNo: string },
  ): Promise<Shipment> {
    const shipment = await this.getShipment(id);
    if (
      shipment.status !== "READY_FOR_DISPATCH" &&
      shipment.status !== "PACKED"
    ) {
      throw new BadRequestException("Shipment must be ready for dispatch");
    }

    const blockers = await this.repository.findBlockedBatchesByShipment(id);
    if (blockers.length > 0) {
      const batchList = blockers.map((b) => `${b.itemSku} (${b.batchNo})`).join(", ");
      throw new BadRequestException(
        `Cannot ship: batch not cleared for dispatch -- ${batchList}`,
      );
    }

    const updated = await this.repository.updateShipmentCarrier(
      id,
      data.carrier,
      data.trackingNo,
    );
    await this.applyShipmentLineQtyToOrderLines(id, "qty_shipped");
    await this.advanceOrderStatus(shipment.tenantId, shipment.salesOrderId, "SHIPPED");
    return updated!;
  }

  // Mark shipment as delivered
  async deliverShipment(id: string): Promise<Shipment> {
    const shipment = await this.getShipment(id);
    if (shipment.status !== "SHIPPED") {
      throw new BadRequestException("Shipment must be shipped before delivery");
    }
    const updated = await this.repository.updateShipmentStatus(id, "DELIVERED");
    await this.advanceOrderStatus(shipment.tenantId, shipment.salesOrderId, "DELIVERED");
    return updated!;
  }

  private async applyShipmentLineQtyToOrderLines(
    shipmentId: string,
    field: "qty_packed" | "qty_shipped",
  ): Promise<void> {
    const lines = await this.repository.findShipmentLinesByShipment(shipmentId);
    for (const line of lines) {
      await this.salesService.incrementOrderLineQty(
        line.salesOrderLineId,
        field,
        line.qty,
      );
    }
  }

  // Reopen delivered shipment back to shipped
  async reopenShipment(id: string): Promise<Shipment> {
    const shipment = await this.getShipment(id);
    if (shipment.status !== "DELIVERED") {
      throw new BadRequestException("Only delivered shipments can be reopened");
    }
    const updated = await this.repository.updateShipmentStatus(id, "SHIPPED");
    return updated!;
  }

  // Get shipments for an order
  async getShipmentsByOrder(salesOrderId: string): Promise<Shipment[]> {
    return this.repository.findShipmentsByOrder(salesOrderId);
  }
}
