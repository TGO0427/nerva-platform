import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
  display_name: string;
  password_hash: string;
  is_active: boolean;
  user_type: 'internal' | 'customer' | 'driver';
  customer_id: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  passwordHash: string;
  isActive: boolean;
  userType: 'internal' | 'customer' | 'driver';
  customerId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersRepository extends BaseRepository {
  private mapRowToUser(row: UserRow): User {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      displayName: row.display_name,
      passwordHash: row.password_hash,
      isActive: row.is_active,
      userType: row.user_type || 'internal',
      customerId: row.customer_id || null,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.queryOne<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );
    return row ? this.mapRowToUser(row) : null;
  }

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    const row = await this.queryOne<UserRow>(
      'SELECT * FROM users WHERE tenant_id = $1 AND LOWER(email) = LOWER($2)',
      [tenantId, email],
    );
    return row ? this.mapRowToUser(row) : null;
  }

  async findByTenant(
    tenantId: string,
    limit: number,
    offset: number,
  ): Promise<User[]> {
    const rows = await this.queryMany<UserRow>(
      `SELECT * FROM users
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset],
    );
    return rows.map(this.mapRowToUser);
  }

  async countByTenant(tenantId: string): Promise<number> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1',
      [tenantId],
    );
    return parseInt(result?.count || '0', 10);
  }

  async create(data: {
    tenantId: string;
    email: string;
    displayName: string;
    passwordHash: string;
    userType?: 'internal' | 'customer' | 'driver';
    customerId?: string;
  }): Promise<User> {
    const row = await this.queryOne<UserRow>(
      `INSERT INTO users (tenant_id, email, display_name, password_hash, user_type, customer_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.tenantId, data.email, data.displayName, data.passwordHash, data.userType || 'internal', data.customerId || null],
    );
    return this.mapRowToUser(row!);
  }

  async update(
    id: string,
    data: Partial<{
      email: string;
      displayName: string;
      passwordHash: string;
      isActive: boolean;
    }>,
  ): Promise<User | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.displayName !== undefined) {
      fields.push(`display_name = $${paramIndex++}`);
      values.push(data.displayName);
    }
    if (data.passwordHash !== undefined) {
      fields.push(`password_hash = $${paramIndex++}`);
      values.push(data.passwordHash);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const row = await this.queryOne<UserRow>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return row ? this.mapRowToUser(row) : null;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.execute(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [id],
    );
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const rows = await this.queryMany<{ code: string }>(
      `SELECT DISTINCT p.code
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN user_roles ur ON ur.role_id = rp.role_id
       WHERE ur.user_id = $1`,
      [userId],
    );
    return rows.map((r) => r.code);
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    await this.execute(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, roleId],
    );
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await this.execute(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId],
    );
  }

  async getUserRoles(userId: string): Promise<{ id: string; name: string }[]> {
    return this.queryMany<{ id: string; name: string }>(
      `SELECT r.id, r.name
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId],
    );
  }

  async getUserSites(userId: string): Promise<{ id: string; name: string; code: string; isActive: boolean }[]> {
    return this.queryMany<{ id: string; name: string; code: string; isActive: boolean }>(
      `SELECT s.id, s.name, s.code, s.is_active as "isActive"
       FROM sites s
       JOIN user_sites us ON us.site_id = s.id
       WHERE us.user_id = $1
       ORDER BY s.name`,
      [userId],
    );
  }

  async assignSite(userId: string, siteId: string): Promise<void> {
    await this.execute(
      `INSERT INTO user_sites (user_id, site_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, siteId],
    );
  }

  async removeSite(userId: string, siteId: string): Promise<void> {
    await this.execute(
      'DELETE FROM user_sites WHERE user_id = $1 AND site_id = $2',
      [userId, siteId],
    );
  }

  async getUserWarehouses(userId: string): Promise<{ id: string; name: string; code: string; siteId: string; siteName: string; isActive: boolean }[]> {
    return this.queryMany<{ id: string; name: string; code: string; siteId: string; siteName: string; isActive: boolean }>(
      `SELECT w.id, w.name, w.code, w.site_id as "siteId", s.name as "siteName", w.is_active as "isActive"
       FROM warehouses w
       JOIN user_warehouses uw ON uw.warehouse_id = w.id
       JOIN sites s ON s.id = w.site_id
       WHERE uw.user_id = $1
       ORDER BY s.name, w.name`,
      [userId],
    );
  }

  async assignWarehouse(userId: string, warehouseId: string): Promise<void> {
    await this.execute(
      `INSERT INTO user_warehouses (user_id, warehouse_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, warehouseId],
    );
  }

  async removeWarehouse(userId: string, warehouseId: string): Promise<void> {
    await this.execute(
      'DELETE FROM user_warehouses WHERE user_id = $1 AND warehouse_id = $2',
      [userId, warehouseId],
    );
  }
}
