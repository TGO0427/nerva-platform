import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UsersRepository, User } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(tenantId, email);
  }

  async findByTenant(tenantId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.usersRepository.findByTenant(tenantId, limit, offset),
      this.usersRepository.countByTenant(tenantId),
    ]);

    return {
      data: users.map(this.sanitizeUser),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(tenantId: string, dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findByEmail(tenantId, dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.usersRepository.create({
      tenantId,
      email: dto.email,
      displayName: dto.displayName,
      passwordHash,
    });

    // Assign roles if provided
    if (dto.roleIds?.length) {
      for (const roleId of dto.roleIds) {
        await this.usersRepository.assignRole(user.id, roleId);
      }
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Parameters<UsersRepository['update']>[1] = {};

    if (dto.email) updateData.email = dto.email;
    if (dto.displayName) updateData.displayName = dto.displayName;
    if (dto.password) updateData.passwordHash = await argon2.hash(dto.password);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.usersRepository.update(id, updateData);
    return updated!;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.usersRepository.updateLastLogin(id);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    return this.usersRepository.getUserPermissions(userId);
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    await this.usersRepository.assignRole(userId, roleId);
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await this.usersRepository.removeRole(userId, roleId);
  }

  async getUserRoles(userId: string) {
    return this.usersRepository.getUserRoles(userId);
  }

  async getUserSites(userId: string) {
    return this.usersRepository.getUserSites(userId);
  }

  async assignSite(userId: string, siteId: string): Promise<void> {
    await this.usersRepository.assignSite(userId, siteId);
  }

  async removeSite(userId: string, siteId: string): Promise<void> {
    await this.usersRepository.removeSite(userId, siteId);
  }

  async getUserWarehouses(userId: string) {
    return this.usersRepository.getUserWarehouses(userId);
  }

  async assignWarehouse(userId: string, warehouseId: string): Promise<void> {
    await this.usersRepository.assignWarehouse(userId, warehouseId);
  }

  async removeWarehouse(userId: string, warehouseId: string): Promise<void> {
    await this.usersRepository.removeWarehouse(userId, warehouseId);
  }

  private sanitizeUser(user: User) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
