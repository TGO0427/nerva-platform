import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/db/base.repository";

export interface Tenant {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Site {
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TenantsRepository extends BaseRepository {
  async findTenantById(id: string): Promise<Tenant | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      "SELECT * FROM tenants WHERE id = $1",
      [id],
    );
    return row ? this.mapTenant(row) : null;
  }

  async findTenantByCode(code: string): Promise<Tenant | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      "SELECT * FROM tenants WHERE code = $1",
      [code],
    );
    return row ? this.mapTenant(row) : null;
  }

  async listTenants(): Promise<Tenant[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      "SELECT * FROM tenants ORDER BY name",
    );
    return rows.map(this.mapTenant);
  }

  async createTenant(data: { name: string; code?: string }): Promise<Tenant> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO tenants (name, code) VALUES ($1, $2) RETURNING *`,
      [data.name, data.code || null],
    );
    return this.mapTenant(row!);
  }

  async updateTenant(
    id: string,
    data: Partial<{ name: string; code: string; isActive: boolean }>,
  ): Promise<Tenant | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.code !== undefined) {
      fields.push(`code = $${idx++}`);
      values.push(data.code);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(data.isActive);
    }

    if (fields.length === 0) return this.findTenantById(id);

    values.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE tenants SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return row ? this.mapTenant(row) : null;
  }

  async findSitesByTenant(tenantId: string): Promise<Site[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      "SELECT * FROM sites WHERE tenant_id = $1 ORDER BY name",
      [tenantId],
    );
    return rows.map(this.mapSite);
  }

  async findSiteById(id: string): Promise<Site | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      "SELECT * FROM sites WHERE id = $1",
      [id],
    );
    return row ? this.mapSite(row) : null;
  }

  async createSite(data: {
    tenantId: string;
    name: string;
    code?: string;
  }): Promise<Site> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO sites (tenant_id, name, code) VALUES ($1, $2, $3) RETURNING *`,
      [data.tenantId, data.name, data.code || null],
    );
    return this.mapSite(row!);
  }

  async updateSite(
    id: string,
    data: Partial<{ name: string; code: string; isActive: boolean }>,
  ): Promise<Site | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.code !== undefined) {
      fields.push(`code = $${idx++}`);
      values.push(data.code);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(data.isActive);
    }

    if (fields.length === 0) return this.findSiteById(id);

    values.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE sites SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return row ? this.mapSite(row) : null;
  }

  async getTenantsWithStats(): Promise<
    (Tenant & { userCount: number })[]
  > {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT t.*,
              COALESCE(uc.cnt, 0) AS user_count
       FROM tenants t
       LEFT JOIN (
         SELECT tenant_id, COUNT(*)::int AS cnt
         FROM users
         GROUP BY tenant_id
       ) uc ON uc.tenant_id = t.id
       ORDER BY t.name`,
    );
    return rows.map((row) => ({
      ...this.mapTenant(row),
      userCount: row.user_count as number,
    }));
  }

  async getTenantStats(
    tenantId: string,
  ): Promise<{
    userCount: number;
    itemCount: number;
    warehouseCount: number;
    orderCount: number;
    siteCount: number;
    lastActivity: Date | null;
  }> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT
         (SELECT COUNT(*)::int FROM users WHERE tenant_id = $1) AS user_count,
         (SELECT COUNT(*)::int FROM items WHERE tenant_id = $1) AS item_count,
         (SELECT COUNT(*)::int FROM warehouses WHERE tenant_id = $1) AS warehouse_count,
         (SELECT COUNT(*)::int FROM sales_orders WHERE tenant_id = $1) AS order_count,
         (SELECT COUNT(*)::int FROM sites WHERE tenant_id = $1) AS site_count,
         (SELECT MAX(created_at) FROM users WHERE tenant_id = $1) AS last_activity`,
      [tenantId],
    );
    return {
      userCount: (row?.user_count as number) ?? 0,
      itemCount: (row?.item_count as number) ?? 0,
      warehouseCount: (row?.warehouse_count as number) ?? 0,
      orderCount: (row?.order_count as number) ?? 0,
      siteCount: (row?.site_count as number) ?? 0,
      lastActivity: (row?.last_activity as Date) ?? null,
    };
  }

  async findUserByEmailGlobal(
    email: string,
  ): Promise<{ id: string; tenantId: string } | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      "SELECT id, tenant_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email],
    );
    return row
      ? { id: row.id as string, tenantId: row.tenant_id as string }
      : null;
  }

  private mapTenant(row: Record<string, unknown>): Tenant {
    return {
      id: row.id as string,
      name: row.name as string,
      code: row.code as string | null,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapSite(row: Record<string, unknown>): Site {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      code: row.code as string | null,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
