import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SalesRepository, SalesOrder, SalesOrderLine } from './sales.repository';
import { StockLedgerService } from '../inventory/stock-ledger.service';
import { MasterDataService } from '../masterdata/masterdata.service';
import { buildPaginatedResult } from '../../common/utils/pagination';
import type { ImportResult } from '../masterdata/dto/import.dto';
import type { SalesOrderImportRowDto } from './dto/sales-import.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly repository: SalesRepository,
    private readonly stockLedger: StockLedgerService,
    private readonly masterDataService: MasterDataService,
  ) {}

  async getNextOrderNumber(tenantId: string): Promise<string> {
    return this.repository.generateOrderNo(tenantId);
  }

  async getOrderStats(tenantId: string) {
    return this.repository.getOrderStats(tenantId);
  }

  async createOrder(data: {
    tenantId: string;
    siteId?: string;
    warehouseId: string;
    customerId: string;
    orderNo?: string;
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
      const warehouse = await this.masterDataService.getWarehouse(data.tenantId, data.warehouseId);
      if (!warehouse) {
        throw new NotFoundException('Warehouse not found');
      }
      siteId = warehouse.siteId;
    }

    // Use provided orderNo or generate one
    const orderNo = data.orderNo || await this.repository.generateOrderNo(data.tenantId);

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
    filters: { status?: string; customerId?: string; search?: string },
    page = 1,
    limit = 50,
  ) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repository.findOrdersByTenant(tenantId, filters, limit, offset),
      this.repository.countOrdersByTenant(tenantId, filters),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async updateOrder(
    id: string,
    data: {
      customerId?: string;
      warehouseId?: string;
      priority?: number;
      requestedShipDate?: Date | null;
      notes?: string | null;
      lines?: Array<{
        itemId: string;
        qtyOrdered: number;
        unitPrice?: number;
      }>;
    },
  ): Promise<SalesOrder> {
    const order = await this.getOrder(id);
    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT orders can be edited');
    }

    // Update header fields
    const updated = await this.repository.updateOrder(id, {
      customerId: data.customerId,
      warehouseId: data.warehouseId,
      priority: data.priority,
      requestedShipDate: data.requestedShipDate,
      notes: data.notes,
    });

    // Replace lines if provided
    if (data.lines) {
      await this.repository.deleteOrderLines(id);
      for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];
        await this.repository.addOrderLine({
          tenantId: order.tenantId,
          salesOrderId: id,
          lineNo: i + 1,
          itemId: line.itemId,
          qtyOrdered: line.qtyOrdered,
          unitPrice: line.unitPrice,
        });
      }
    }

    return updated!;
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

    // Check and allocate stock for each line using FEFO
    for (const line of lines) {
      const available = await this.stockLedger.getTotalAvailable(order.tenantId, line.itemId);
      const toAllocate = Math.min(line.qtyOrdered - line.qtyAllocated, available);

      if (toAllocate > 0) {
        // Get stock from bins in FEFO order (First Expired, First Out)
        const stock = await this.stockLedger.getAvailableStockFEFO(order.tenantId, line.itemId);

        let remaining = toAllocate;
        for (const s of stock) {
          if (remaining <= 0) break;
          const reserveQty = Math.min(remaining, s.qtyAvailable);
          if (reserveQty > 0) {
            // Reserve stock with batch/expiry info for FEFO tracking
            await this.stockLedger.reserveStockWithBatch(
              order.tenantId,
              s.binId,
              line.itemId,
              reserveQty,
              s.batchNo,
              s.expiryDate,
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

  async reopenOrder(id: string): Promise<SalesOrder> {
    const order = await this.getOrder(id);
    if (!['CANCELLED', 'DELIVERED'].includes(order.status)) {
      throw new BadRequestException('Only cancelled or delivered orders can be reopened');
    }

    const newStatus = order.status === 'CANCELLED' ? 'DRAFT' : 'SHIPPED';
    const updated = await this.repository.updateOrderStatus(id, newStatus);
    return updated!;
  }

  async deleteOrder(id: string): Promise<void> {
    const order = await this.repository.findOrderById(id);
    if (!order) throw new NotFoundException('Sales order not found');
    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT orders can be deleted');
    }
    await this.repository.deleteOrder(id);
  }

  // Bulk import
  async importOrders(
    tenantId: string,
    siteId: string,
    createdBy: string,
    rows: SalesOrderImportRowDto[],
  ): Promise<ImportResult> {
    // 1. Resolve warehouse: get first warehouse for site
    const warehouses = await this.masterDataService.listWarehouses(tenantId, siteId);
    if (warehouses.length === 0) {
      throw new BadRequestException('No warehouse found for the selected site');
    }
    const warehouseId = warehouses[0].id;

    // 2. Resolve customer codes
    const uniqueCustomerCodes = [...new Set(rows.map((r) => r.customerCode))];
    const customerMap = await this.masterDataService.resolveCustomerCodes(tenantId, uniqueCustomerCodes);
    const unknownCustomers = uniqueCustomerCodes.filter((c) => !customerMap.has(c.toLowerCase()));
    if (unknownCustomers.length > 0) {
      throw new BadRequestException(`Unknown customer codes: ${unknownCustomers.join(', ')}`);
    }

    // 3. Resolve SKUs
    const uniqueSkus = [...new Set(rows.map((r) => r.sku))];
    const itemMap = await this.masterDataService.resolveItemSkus(tenantId, uniqueSkus);
    const unknownSkus = uniqueSkus.filter((s) => !itemMap.has(s.toLowerCase()));
    if (unknownSkus.length > 0) {
      throw new BadRequestException(`Unknown SKUs: ${unknownSkus.join(', ')}`);
    }

    // 4. Group rows by orderGroup
    const groups = new Map<number, SalesOrderImportRowDto[]>();
    for (const row of rows) {
      const group = groups.get(row.orderGroup) || [];
      group.push(row);
      groups.set(row.orderGroup, group);
    }

    // 5. Check for duplicate external refs
    const refsToCheck: Array<{ externalRef: string; customerId: string }> = [];
    for (const [, groupRows] of groups) {
      const header = groupRows[0];
      if (header.externalRef) {
        const customerId = customerMap.get(header.customerCode.toLowerCase())!;
        refsToCheck.push({ externalRef: header.externalRef, customerId });
      }
    }
    const existingRefs = await this.repository.findExistingExternalRefs(tenantId, refsToCheck);

    // 6. Create orders
    let imported = 0;
    const skippedCodes: string[] = [];

    for (const [groupNo, groupRows] of groups) {
      const header = groupRows[0];
      const customerId = customerMap.get(header.customerCode.toLowerCase())!;

      // Skip if duplicate external ref for this customer
      if (header.externalRef) {
        const key = `${header.externalRef}::${customerId}`;
        if (existingRefs.has(key)) {
          skippedCodes.push(`Group ${groupNo}: duplicate external ref '${header.externalRef}'`);
          continue;
        }
      }

      const lines = groupRows.map((r) => ({
        itemId: itemMap.get(r.sku.toLowerCase())!,
        qtyOrdered: r.qty,
        unitPrice: r.unitPrice,
      }));

      await this.createOrder({
        tenantId,
        siteId,
        warehouseId,
        customerId,
        externalRef: header.externalRef,
        priority: header.priority,
        requestedShipDate: header.requestedShipDate ? new Date(header.requestedShipDate) : undefined,
        createdBy,
        lines,
      });

      imported++;
    }

    return {
      imported,
      skipped: skippedCodes.length,
      skippedCodes,
    };
  }

  // Generic status update for internal use (e.g., from fulfilment service)
  async updateOrderStatus(id: string, status: string): Promise<SalesOrder> {
    const order = await this.getOrder(id);
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['ALLOCATED', 'CANCELLED'],
      ALLOCATED: ['PICKING', 'CANCELLED'],
      PICKING: ['PICKED', 'CANCELLED'],
      PICKED: ['PACKING', 'CANCELLED'],
      PACKING: ['PACKED', 'CANCELLED'],
      PACKED: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED'],
      DELIVERED: ['SHIPPED'],
      CANCELLED: ['DRAFT'],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${status}`,
      );
    }

    const updated = await this.repository.updateOrderStatus(id, status);
    return updated!;
  }
}
