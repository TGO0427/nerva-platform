import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/db/base.repository';

export interface WorkOrder {
  id: string;
  tenantId: string;
  siteId: string;
  warehouseId: string;
  workOrderNo: string;
  itemId: string;
  bomHeaderId: string | null;
  routingId: string | null;
  status: string;
  priority: number;
  qtyOrdered: number;
  qtyCompleted: number;
  qtyScrapped: number;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  salesOrderId: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkOrderOperation {
  id: string;
  tenantId: string;
  workOrderId: string;
  routingOperationId: string | null;
  operationNo: number;
  name: string;
  workstationId: string | null;
  assignedUserId: string | null;
  status: string;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  qtyCompleted: number;
  qtyScrapped: number;
  setupTimeActual: number | null;
  runTimeActual: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkOrderMaterial {
  id: string;
  tenantId: string;
  workOrderId: string;
  bomLineId: string | null;
  itemId: string;
  qtyRequired: number;
  qtyIssued: number;
  qtyReturned: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WorkOrderRepository extends BaseRepository {
  async create(data: {
    tenantId: string;
    siteId: string;
    warehouseId: string;
    workOrderNo: string;
    itemId: string;
    bomHeaderId?: string;
    routingId?: string;
    priority?: number;
    qtyOrdered: number;
    plannedStart?: Date;
    plannedEnd?: Date;
    salesOrderId?: string;
    notes?: string;
    createdBy: string;
  }): Promise<WorkOrder> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO work_orders (
        tenant_id, site_id, warehouse_id, work_order_no, item_id, bom_header_id, routing_id,
        priority, qty_ordered, planned_start, planned_end, sales_order_id, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        data.tenantId,
        data.siteId,
        data.warehouseId,
        data.workOrderNo,
        data.itemId,
        data.bomHeaderId || null,
        data.routingId || null,
        data.priority || 50,
        data.qtyOrdered,
        data.plannedStart || null,
        data.plannedEnd || null,
        data.salesOrderId || null,
        data.notes || null,
        data.createdBy,
      ],
    );
    return this.mapWorkOrder(row!);
  }

  async findById(id: string): Promise<(WorkOrder & { itemSku?: string; itemDescription?: string; warehouseName?: string }) | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT wo.*, i.sku as item_sku, i.description as item_description, w.name as warehouse_name
       FROM work_orders wo
       LEFT JOIN items i ON i.id = wo.item_id
       LEFT JOIN warehouses w ON w.id = wo.warehouse_id
       WHERE wo.id = $1`,
      [id],
    );
    if (!row) return null;
    return {
      ...this.mapWorkOrder(row),
      itemSku: row.item_sku as string,
      itemDescription: row.item_description as string,
      warehouseName: row.warehouse_name as string,
    };
  }

  async findByTenant(
    tenantId: string,
    filters: { status?: string; itemId?: string; warehouseId?: string; search?: string },
    limit = 50,
    offset = 0,
  ): Promise<{ data: (WorkOrder & { itemSku?: string; itemDescription?: string; warehouseName?: string })[]; total: number }> {
    let sql = `
      SELECT wo.*, i.sku as item_sku, i.description as item_description, w.name as warehouse_name
      FROM work_orders wo
      JOIN items i ON i.id = wo.item_id
      JOIN warehouses w ON w.id = wo.warehouse_id
      WHERE wo.tenant_id = $1
    `;
    let countSql = `
      SELECT COUNT(*) as count FROM work_orders wo
      JOIN items i ON i.id = wo.item_id
      WHERE wo.tenant_id = $1
    `;
    const params: unknown[] = [tenantId];
    const countParams: unknown[] = [tenantId];
    let idx = 2;

    if (filters.status) {
      sql += ` AND wo.status = $${idx}`;
      countSql += ` AND wo.status = $${idx}`;
      params.push(filters.status);
      countParams.push(filters.status);
      idx++;
    }
    if (filters.itemId) {
      sql += ` AND wo.item_id = $${idx}`;
      countSql += ` AND wo.item_id = $${idx}`;
      params.push(filters.itemId);
      countParams.push(filters.itemId);
      idx++;
    }
    if (filters.warehouseId) {
      sql += ` AND wo.warehouse_id = $${idx}`;
      countSql += ` AND wo.warehouse_id = $${idx}`;
      params.push(filters.warehouseId);
      countParams.push(filters.warehouseId);
      idx++;
    }
    if (filters.search) {
      sql += ` AND (wo.work_order_no ILIKE $${idx} OR i.sku ILIKE $${idx} OR i.description ILIKE $${idx})`;
      countSql += ` AND (wo.work_order_no ILIKE $${idx} OR i.sku ILIKE $${idx} OR i.description ILIKE $${idx})`;
      params.push(`%${filters.search}%`);
      countParams.push(`%${filters.search}%`);
      idx++;
    }

    sql += ` ORDER BY wo.priority ASC, wo.planned_start ASC NULLS LAST, wo.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const [rows, countResult] = await Promise.all([
      this.queryMany<Record<string, unknown>>(sql, params),
      this.queryOne<{ count: string }>(countSql, countParams),
    ]);

    return {
      data: rows.map((r) => ({
        ...this.mapWorkOrder(r),
        itemSku: r.item_sku as string,
        itemDescription: r.item_description as string,
        warehouseName: r.warehouse_name as string,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  }

  async generateWorkOrderNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM work_orders WHERE tenant_id = $1',
      [tenantId],
    );
    const count = parseInt(result?.count || '0', 10) + 1;
    return `WO-${count.toString().padStart(6, '0')}`;
  }

  async update(
    id: string,
    data: Partial<{
      bomHeaderId: string;
      routingId: string;
      status: string;
      priority: number;
      qtyOrdered: number;
      qtyCompleted: number;
      qtyScrapped: number;
      plannedStart: Date;
      plannedEnd: Date;
      actualStart: Date;
      actualEnd: Date;
      notes: string;
    }>,
  ): Promise<WorkOrder | null> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.bomHeaderId !== undefined) {
      updates.push(`bom_header_id = $${idx++}`);
      params.push(data.bomHeaderId);
    }
    if (data.routingId !== undefined) {
      updates.push(`routing_id = $${idx++}`);
      params.push(data.routingId);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${idx++}`);
      params.push(data.status);
    }
    if (data.priority !== undefined) {
      updates.push(`priority = $${idx++}`);
      params.push(data.priority);
    }
    if (data.qtyOrdered !== undefined) {
      updates.push(`qty_ordered = $${idx++}`);
      params.push(data.qtyOrdered);
    }
    if (data.qtyCompleted !== undefined) {
      updates.push(`qty_completed = $${idx++}`);
      params.push(data.qtyCompleted);
    }
    if (data.qtyScrapped !== undefined) {
      updates.push(`qty_scrapped = $${idx++}`);
      params.push(data.qtyScrapped);
    }
    if (data.plannedStart !== undefined) {
      updates.push(`planned_start = $${idx++}`);
      params.push(data.plannedStart);
    }
    if (data.plannedEnd !== undefined) {
      updates.push(`planned_end = $${idx++}`);
      params.push(data.plannedEnd);
    }
    if (data.actualStart !== undefined) {
      updates.push(`actual_start = $${idx++}`);
      params.push(data.actualStart);
    }
    if (data.actualEnd !== undefined) {
      updates.push(`actual_end = $${idx++}`);
      params.push(data.actualEnd);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      params.push(data.notes);
    }

    if (updates.length === 0) return this.findById(id);

    params.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE work_orders SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    return row ? this.mapWorkOrder(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const count = await this.execute('DELETE FROM work_orders WHERE id = $1', [id]);
    return count > 0;
  }

  // Operations
  async addOperation(data: {
    tenantId: string;
    workOrderId: string;
    routingOperationId?: string;
    operationNo: number;
    name: string;
    workstationId?: string;
    plannedStart?: Date;
    plannedEnd?: Date;
  }): Promise<WorkOrderOperation> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO work_order_operations (
        tenant_id, work_order_id, routing_operation_id, operation_no, name, workstation_id,
        planned_start, planned_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.tenantId,
        data.workOrderId,
        data.routingOperationId || null,
        data.operationNo,
        data.name,
        data.workstationId || null,
        data.plannedStart || null,
        data.plannedEnd || null,
      ],
    );
    return this.mapOperation(row!);
  }

  async getOperations(workOrderId: string): Promise<(WorkOrderOperation & { workstationCode?: string; workstationName?: string; assignedUserName?: string })[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT woo.*, w.code as workstation_code, w.name as workstation_name, u.display_name as assigned_user_name
       FROM work_order_operations woo
       LEFT JOIN workstations w ON w.id = woo.workstation_id
       LEFT JOIN users u ON u.id = woo.assigned_user_id
       WHERE woo.work_order_id = $1
       ORDER BY woo.operation_no`,
      [workOrderId],
    );
    return rows.map((r) => ({
      ...this.mapOperation(r),
      workstationCode: r.workstation_code as string | undefined,
      workstationName: r.workstation_name as string | undefined,
      assignedUserName: r.assigned_user_name as string | undefined,
    }));
  }

  async findOperationById(id: string): Promise<WorkOrderOperation | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM work_order_operations WHERE id = $1',
      [id],
    );
    return row ? this.mapOperation(row) : null;
  }

  async updateOperation(
    id: string,
    data: Partial<{
      workstationId: string;
      assignedUserId: string;
      status: string;
      plannedStart: Date;
      plannedEnd: Date;
      actualStart: Date;
      actualEnd: Date;
      qtyCompleted: number;
      qtyScrapped: number;
      setupTimeActual: number;
      runTimeActual: number;
      notes: string;
    }>,
  ): Promise<WorkOrderOperation | null> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.workstationId !== undefined) {
      updates.push(`workstation_id = $${idx++}`);
      params.push(data.workstationId);
    }
    if (data.assignedUserId !== undefined) {
      updates.push(`assigned_user_id = $${idx++}`);
      params.push(data.assignedUserId);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${idx++}`);
      params.push(data.status);
    }
    if (data.plannedStart !== undefined) {
      updates.push(`planned_start = $${idx++}`);
      params.push(data.plannedStart);
    }
    if (data.plannedEnd !== undefined) {
      updates.push(`planned_end = $${idx++}`);
      params.push(data.plannedEnd);
    }
    if (data.actualStart !== undefined) {
      updates.push(`actual_start = $${idx++}`);
      params.push(data.actualStart);
    }
    if (data.actualEnd !== undefined) {
      updates.push(`actual_end = $${idx++}`);
      params.push(data.actualEnd);
    }
    if (data.qtyCompleted !== undefined) {
      updates.push(`qty_completed = $${idx++}`);
      params.push(data.qtyCompleted);
    }
    if (data.qtyScrapped !== undefined) {
      updates.push(`qty_scrapped = $${idx++}`);
      params.push(data.qtyScrapped);
    }
    if (data.setupTimeActual !== undefined) {
      updates.push(`setup_time_actual = $${idx++}`);
      params.push(data.setupTimeActual);
    }
    if (data.runTimeActual !== undefined) {
      updates.push(`run_time_actual = $${idx++}`);
      params.push(data.runTimeActual);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      params.push(data.notes);
    }

    if (updates.length === 0) return null;

    params.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE work_order_operations SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    return row ? this.mapOperation(row) : null;
  }

  // Materials
  async addMaterial(data: {
    tenantId: string;
    workOrderId: string;
    bomLineId?: string;
    itemId: string;
    qtyRequired: number;
  }): Promise<WorkOrderMaterial> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO work_order_materials (
        tenant_id, work_order_id, bom_line_id, item_id, qty_required
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        data.tenantId,
        data.workOrderId,
        data.bomLineId || null,
        data.itemId,
        data.qtyRequired,
      ],
    );
    return this.mapMaterial(row!);
  }

  async getMaterials(workOrderId: string): Promise<(WorkOrderMaterial & { itemSku?: string; itemDescription?: string })[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT wom.*, i.sku as item_sku, i.description as item_description
       FROM work_order_materials wom
       JOIN items i ON i.id = wom.item_id
       WHERE wom.work_order_id = $1
       ORDER BY i.sku`,
      [workOrderId],
    );
    return rows.map((r) => ({
      ...this.mapMaterial(r),
      itemSku: r.item_sku as string,
      itemDescription: r.item_description as string,
    }));
  }

  async findMaterialById(id: string): Promise<WorkOrderMaterial | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM work_order_materials WHERE id = $1',
      [id],
    );
    return row ? this.mapMaterial(row) : null;
  }

  async updateMaterial(
    id: string,
    data: Partial<{
      qtyRequired: number;
      qtyIssued: number;
      qtyReturned: number;
      status: string;
    }>,
  ): Promise<WorkOrderMaterial | null> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.qtyRequired !== undefined) {
      updates.push(`qty_required = $${idx++}`);
      params.push(data.qtyRequired);
    }
    if (data.qtyIssued !== undefined) {
      updates.push(`qty_issued = $${idx++}`);
      params.push(data.qtyIssued);
    }
    if (data.qtyReturned !== undefined) {
      updates.push(`qty_returned = $${idx++}`);
      params.push(data.qtyReturned);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${idx++}`);
      params.push(data.status);
    }

    if (updates.length === 0) return null;

    params.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE work_order_materials SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    return row ? this.mapMaterial(row) : null;
  }

  private mapWorkOrder(row: Record<string, unknown>): WorkOrder {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      siteId: row.site_id as string,
      warehouseId: row.warehouse_id as string,
      workOrderNo: row.work_order_no as string,
      itemId: row.item_id as string,
      bomHeaderId: row.bom_header_id as string | null,
      routingId: row.routing_id as string | null,
      status: row.status as string,
      priority: row.priority as number,
      qtyOrdered: parseFloat(row.qty_ordered as string),
      qtyCompleted: parseFloat(row.qty_completed as string),
      qtyScrapped: parseFloat(row.qty_scrapped as string),
      plannedStart: row.planned_start as Date | null,
      plannedEnd: row.planned_end as Date | null,
      actualStart: row.actual_start as Date | null,
      actualEnd: row.actual_end as Date | null,
      salesOrderId: row.sales_order_id as string | null,
      notes: row.notes as string | null,
      createdBy: row.created_by as string,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapOperation(row: Record<string, unknown>): WorkOrderOperation {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      workOrderId: row.work_order_id as string,
      routingOperationId: row.routing_operation_id as string | null,
      operationNo: row.operation_no as number,
      name: row.name as string,
      workstationId: row.workstation_id as string | null,
      assignedUserId: row.assigned_user_id as string | null,
      status: row.status as string,
      plannedStart: row.planned_start as Date | null,
      plannedEnd: row.planned_end as Date | null,
      actualStart: row.actual_start as Date | null,
      actualEnd: row.actual_end as Date | null,
      qtyCompleted: parseFloat((row.qty_completed as string) || '0'),
      qtyScrapped: parseFloat((row.qty_scrapped as string) || '0'),
      setupTimeActual: row.setup_time_actual ? parseFloat(row.setup_time_actual as string) : null,
      runTimeActual: row.run_time_actual ? parseFloat(row.run_time_actual as string) : null,
      notes: row.notes as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapMaterial(row: Record<string, unknown>): WorkOrderMaterial {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      workOrderId: row.work_order_id as string,
      bomLineId: row.bom_line_id as string | null,
      itemId: row.item_id as string,
      qtyRequired: parseFloat(row.qty_required as string),
      qtyIssued: parseFloat((row.qty_issued as string) || '0'),
      qtyReturned: parseFloat((row.qty_returned as string) || '0'),
      status: row.status as string,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
