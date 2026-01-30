import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SalesRepository, SalesOrder, SalesOrderLine } from './sales.repository';
import { StockLedgerService } from '../inventory/stock-ledger.service';
import { MasterDataService } from '../masterdata/masterdata.service';

@Injectable()
export class SalesService {
  constructor(
    private readonly repository: SalesRepository,
    private readonly stockLedger: StockLedgerService,
    private readonly masterDataService: MasterDataService,
  ) {}

  async createOrder(data: {
    tenantId: string;
    siteId?: string;
    warehouseId: string;
    customerId: string;
    externalRef?: string;
    priority?: number;
    requestedShipDate?: Date;
    shippingAddressLine1?: string;
    shippingCity?: string;
    notes?: string;
    createdBy?: string;
    lines: Array<{
      itemId: string;
      qtyOrdered: number;
      unitPrice?: number;
    }>;
  }): Promise<SalesOrder> {
    // Get siteId from warehouse if not provided
    let siteId = data.siteId;
    if (!siteId) {
      const warehouse = await this.masterDataService.getWarehouse(data.warehouseId);
      if (!warehouse) {
        throw new NotFoundException('Warehouse not found');
      }
      siteId = warehouse.siteId;
    }

    const orderNo = await this.repository.generateOrderNo(data.tenantId);

    const order = await this.repository.createOrder({
      tenantId: data.tenantId,
      siteId,
      warehouseId: data.warehouseId,
      customerId: data.customerId,
      orderNo,
      externalRef: data.externalRef,
      priority: data.priority,
      requestedShipDate: data.requestedShipDate,
      shippingAddressLine1: data.shippingAddressLine1,
      shippingCity: data.shippingCity,
      notes: data.notes,
      createdBy: data.createdBy,
    });

    // Add order lines
    for (let i = 0; i < data.lines.length; i++) {
      const line = data.lines[i];
      await this.repository.addOrderLine({
        tenantId: data.tenantId,
        salesOrderId: order.id,
        lineNo: i + 1,
        itemId: line.itemId,
        qtyOrdered: line.qtyOrdered,
        unitPrice: line.unitPrice,
      });
    }

    return order;
  }

  async getOrder(id: string): Promise<SalesOrder> {
    const order = await this.repository.findOrderById(id);
    if (!order) throw new NotFoundException('Sales order not found');
    return order;
  }

  async getOrderWithLines(id: string): Promise<SalesOrder & { lines: SalesOrderLine[] }> {
    const order = await this.getOrder(id);
    const lines = await this.repository.getOrderLines(id);
    return { ...order, lines };
  }

  async listOrders(
    tenantId: string,
    filters: { status?: string; customerId?: string },
    page = 1,
    limit = 50,
  ) {
    const offset = (page - 1) * limit;
    const orders = await this.repository.findOrdersByTenant(tenantId, filters, limit, offset);
    return { data: orders, meta: { page, limit } };
  }

  async confirmOrder(id: string): Promise<SalesOrder> {
    const order = await this.getOrder(id);
    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Only draft orders can be confirmed');
    }
    const updated = await this.repository.updateOrderStatus(id, 'CONFIRMED');
    return updated!;
  }

  async allocateOrder(id: string): Promise<SalesOrder> {
    const order = await this.getOrder(id);
    if (order.status !== 'CONFIRMED') {
      throw new BadRequestException('Only confirmed orders can be allocated');
    }

    const lines = await this.repository.getOrderLines(id);

    // Check and allocate stock for each line
    for (const line of lines) {
      const available = await this.stockLedger.getTotalAvailable(order.tenantId, line.itemId);
      const toAllocate = Math.min(line.qtyOrdered - line.qtyAllocated, available);

      if (toAllocate > 0) {
        // Get stock from bins and reserve
        const stock = await this.stockLedger.getStockOnHand(order.tenantId, line.itemId);

        let remaining = toAllocate;
        for (const s of stock) {
          if (remaining <= 0) break;
          const reserveQty = Math.min(remaining, s.qtyAvailable);
          if (reserveQty > 0) {
            await this.stockLedger.reserveStock(
              order.tenantId,
              s.binId,
              line.itemId,
              reserveQty,
              s.batchNo || undefined,
            );
            remaining -= reserveQty;
          }
        }

        await this.repository.updateOrderLineQty(
          line.id,
          'qty_allocated',
          line.qtyAllocated + toAllocate,
        );
      }
    }

    const updated = await this.repository.updateOrderStatus(id, 'ALLOCATED');
    return updated!;
  }

  async cancelOrder(id: string): Promise<SalesOrder> {
    const order = await this.getOrder(id);
    if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('Cannot cancel order in current status');
    }

    // Release any reservations
    const lines = await this.repository.getOrderLines(id);
    for (const line of lines) {
      if (line.qtyAllocated > 0) {
        const stock = await this.stockLedger.getStockOnHand(order.tenantId, line.itemId);
        for (const s of stock) {
          if (s.qtyReserved > 0) {
            await this.stockLedger.releaseReservation(
              order.tenantId,
              s.binId,
              line.itemId,
              Math.min(s.qtyReserved, line.qtyAllocated),
              s.batchNo || undefined,
            );
          }
        }
      }
    }

    const updated = await this.repository.updateOrderStatus(id, 'CANCELLED');
    return updated!;
  }
}
