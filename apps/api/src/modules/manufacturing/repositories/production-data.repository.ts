import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../../common/db/base.repository";

export interface WorkOrderChecks {
  id: string;
  tenantId: string;
  workOrderId: string;
  reworkProduct: string | null;
  reworkQtyKgs: number | null;
  theoreticalBoxes: number | null;
  actualBoxes: number | null;
  actualOvers: number | null;
  actualTotal: number | null;
  diffToTheoretical: number | null;
  loaderSignature: string | null;
  operationsManagerSignature: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkOrderProcess {
  id: string;
  tenantId: string;
  workOrderId: string;
  instructions: string | null;
  specsJson: Record<string, unknown>;
  operator: string | null;
  potUsed: string | null;
  timeStarted: Date | null;
  time85c: Date | null;
  timeFlavourAdded: Date | null;
  timeCompleted: Date | null;
  additions: string | null;
  reasonForAddition: string | null;
  comments: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ProductionDataRepository extends BaseRepository {
  // ============ Checks ============
  async upsertChecks(data: {
    tenantId: string;
    workOrderId: string;
    reworkProduct?: string;
    reworkQtyKgs?: number;
    theoreticalBoxes?: number;
    actualBoxes?: number;
    actualOvers?: number;
    actualTotal?: number;
    diffToTheoretical?: number;
    loaderSignature?: string;
    operationsManagerSignature?: string;
  }): Promise<WorkOrderChecks> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO work_order_checks (
        tenant_id, work_order_id, rework_product, rework_qty_kgs,
        theoretical_boxes, actual_boxes, actual_overs, actual_total,
        diff_to_theoretical, loader_signature, operations_manager_signature
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (work_order_id) DO UPDATE SET
        rework_product = EXCLUDED.rework_product,
        rework_qty_kgs = EXCLUDED.rework_qty_kgs,
        theoretical_boxes = EXCLUDED.theoretical_boxes,
        actual_boxes = EXCLUDED.actual_boxes,
        actual_overs = EXCLUDED.actual_overs,
        actual_total = EXCLUDED.actual_total,
        diff_to_theoretical = EXCLUDED.diff_to_theoretical,
        loader_signature = EXCLUDED.loader_signature,
        operations_manager_signature = EXCLUDED.operations_manager_signature
      RETURNING *`,
      [
        data.tenantId,
        data.workOrderId,
        data.reworkProduct ?? null,
        data.reworkQtyKgs ?? null,
        data.theoreticalBoxes ?? null,
        data.actualBoxes ?? null,
        data.actualOvers ?? null,
        data.actualTotal ?? null,
        data.diffToTheoretical ?? null,
        data.loaderSignature ?? null,
        data.operationsManagerSignature ?? null,
      ],
    );
    return this.mapChecks(row!);
  }

  async findChecksByWorkOrder(
    workOrderId: string,
  ): Promise<WorkOrderChecks | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      "SELECT * FROM work_order_checks WHERE work_order_id = $1",
      [workOrderId],
    );
    return row ? this.mapChecks(row) : null;
  }

  // ============ Process ============
  async upsertProcess(data: {
    tenantId: string;
    workOrderId: string;
    instructions?: string;
    specsJson?: Record<string, unknown>;
    operator?: string;
    potUsed?: string;
    timeStarted?: Date | string;
    time85c?: Date | string;
    timeFlavourAdded?: Date | string;
    timeCompleted?: Date | string;
    additions?: string;
    reasonForAddition?: string;
    comments?: string;
  }): Promise<WorkOrderProcess> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO work_order_process (
        tenant_id, work_order_id, instructions, specs_json, operator, pot_used,
        time_started, time_85c, time_flavour_added, time_completed,
        additions, reason_for_addition, comments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (work_order_id) DO UPDATE SET
        instructions = EXCLUDED.instructions,
        specs_json = EXCLUDED.specs_json,
        operator = EXCLUDED.operator,
        pot_used = EXCLUDED.pot_used,
        time_started = EXCLUDED.time_started,
        time_85c = EXCLUDED.time_85c,
        time_flavour_added = EXCLUDED.time_flavour_added,
        time_completed = EXCLUDED.time_completed,
        additions = EXCLUDED.additions,
        reason_for_addition = EXCLUDED.reason_for_addition,
        comments = EXCLUDED.comments
      RETURNING *`,
      [
        data.tenantId,
        data.workOrderId,
        data.instructions ?? null,
        JSON.stringify(data.specsJson ?? {}),
        data.operator ?? null,
        data.potUsed ?? null,
        data.timeStarted ?? null,
        data.time85c ?? null,
        data.timeFlavourAdded ?? null,
        data.timeCompleted ?? null,
        data.additions ?? null,
        data.reasonForAddition ?? null,
        data.comments ?? null,
      ],
    );
    return this.mapProcess(row!);
  }

  async findProcessByWorkOrder(
    workOrderId: string,
  ): Promise<WorkOrderProcess | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      "SELECT * FROM work_order_process WHERE work_order_id = $1",
      [workOrderId],
    );
    return row ? this.mapProcess(row) : null;
  }

  // ============ Mappers ============
  private mapChecks(row: Record<string, unknown>): WorkOrderChecks {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      workOrderId: row.work_order_id as string,
      reworkProduct: row.rework_product as string | null,
      reworkQtyKgs:
        row.rework_qty_kgs != null
          ? parseFloat(row.rework_qty_kgs as string)
          : null,
      theoreticalBoxes:
        row.theoretical_boxes != null
          ? parseFloat(row.theoretical_boxes as string)
          : null,
      actualBoxes:
        row.actual_boxes != null
          ? parseFloat(row.actual_boxes as string)
          : null,
      actualOvers:
        row.actual_overs != null
          ? parseFloat(row.actual_overs as string)
          : null,
      actualTotal:
        row.actual_total != null
          ? parseFloat(row.actual_total as string)
          : null,
      diffToTheoretical:
        row.diff_to_theoretical != null
          ? parseFloat(row.diff_to_theoretical as string)
          : null,
      loaderSignature: row.loader_signature as string | null,
      operationsManagerSignature: row.operations_manager_signature as
        | string
        | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapProcess(row: Record<string, unknown>): WorkOrderProcess {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      workOrderId: row.work_order_id as string,
      instructions: row.instructions as string | null,
      specsJson: (row.specs_json as Record<string, unknown>) ?? {},
      operator: row.operator as string | null,
      potUsed: row.pot_used as string | null,
      timeStarted: row.time_started as Date | null,
      time85c: row.time_85c as Date | null,
      timeFlavourAdded: row.time_flavour_added as Date | null,
      timeCompleted: row.time_completed as Date | null,
      additions: row.additions as string | null,
      reasonForAddition: row.reason_for_addition as string | null,
      comments: row.comments as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
