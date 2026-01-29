import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  code: string;
  description: string | null;
}

@Injectable()
export class RbacRepository extends BaseRepository {
  async findRolesByTenant(tenantId: string): Promise<Role[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      'SELECT * FROM roles WHERE tenant_id = $1 ORDER BY name',
      [tenantId],
    );
    return rows.map(this.mapRole);
  }

  async findRoleById(id: string): Promise<Role | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM roles WHERE id = $1',
      [id],
    );
    return row ? this.mapRole(row) : null;
  }

  async createRole(data: {
    tenantId: string;
    name: string;
    description?: string;
  }): Promise<Role> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO roles (tenant_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.tenantId, data.name, data.description || null],
    );
    return this.mapRole(row!);
  }

  async updateRole(
    id: string,
    data: Partial<{ name: string; description: string }>,
  ): Promise<Role | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }

    if (fields.length === 0) return this.findRoleById(id);

    values.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE roles SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return row ? this.mapRole(row) : null;
  }

  async deleteRole(id: string): Promise<boolean> {
    const count = await this.execute('DELETE FROM roles WHERE id = $1', [id]);
    return count > 0;
  }

  async listPermissions(): Promise<Permission[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      'SELECT * FROM permissions ORDER BY code',
    );
    return rows.map(this.mapPermission);
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT p.* FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = $1
       ORDER BY p.code`,
      [roleId],
    );
    return rows.map(this.mapPermission);
  }

  async setRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    await this.execute('DELETE FROM role_permissions WHERE role_id = $1', [
      roleId,
    ]);

    if (permissionIds.length > 0) {
      const values = permissionIds
        .map((_, i) => `($1, $${i + 2})`)
        .join(', ');
      await this.execute(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`,
        [roleId, ...permissionIds],
      );
    }
  }

  async addPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    await this.execute(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [roleId, permissionId],
    );
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    await this.execute(
      'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
      [roleId, permissionId],
    );
  }

  private mapRole(row: Record<string, unknown>): Role {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapPermission(row: Record<string, unknown>): Permission {
    return {
      id: row.id as string,
      code: row.code as string,
      description: row.description as string | null,
    };
  }
}
