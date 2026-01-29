import { Injectable, NotFoundException } from '@nestjs/common';
import { RbacRepository, Role, Permission } from './rbac.repository';

@Injectable()
export class RbacService {
  constructor(private readonly rbacRepository: RbacRepository) {}

  async findRolesByTenant(tenantId: string): Promise<Role[]> {
    return this.rbacRepository.findRolesByTenant(tenantId);
  }

  async findRoleById(id: string): Promise<Role | null> {
    return this.rbacRepository.findRoleById(id);
  }

  async createRole(data: {
    tenantId: string;
    name: string;
    description?: string;
    permissionIds?: string[];
  }): Promise<Role> {
    const role = await this.rbacRepository.createRole({
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
    });

    if (data.permissionIds?.length) {
      await this.rbacRepository.setRolePermissions(role.id, data.permissionIds);
    }

    return role;
  }

  async updateRole(
    id: string,
    data: Partial<{ name: string; description: string }>,
  ): Promise<Role> {
    const role = await this.rbacRepository.updateRole(id, data);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async deleteRole(id: string): Promise<void> {
    const deleted = await this.rbacRepository.deleteRole(id);
    if (!deleted) {
      throw new NotFoundException('Role not found');
    }
  }

  async listPermissions(): Promise<Permission[]> {
    return this.rbacRepository.listPermissions();
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    return this.rbacRepository.getRolePermissions(roleId);
  }

  async setRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    await this.rbacRepository.setRolePermissions(roleId, permissionIds);
  }

  async addPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    await this.rbacRepository.addPermissionToRole(roleId, permissionId);
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    await this.rbacRepository.removePermissionFromRole(roleId, permissionId);
  }
}
