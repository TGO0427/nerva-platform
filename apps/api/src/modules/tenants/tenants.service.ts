import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantsRepository, Tenant, Site } from './tenants.repository';

@Injectable()
export class TenantsService {
  constructor(private readonly tenantsRepository: TenantsRepository) {}

  async findTenantById(id: string): Promise<Tenant | null> {
    return this.tenantsRepository.findTenantById(id);
  }

  async listTenants(): Promise<Tenant[]> {
    return this.tenantsRepository.listTenants();
  }

  async createTenant(data: { name: string; code?: string }): Promise<Tenant> {
    return this.tenantsRepository.createTenant(data);
  }

  async updateTenant(
    id: string,
    data: Partial<{ name: string; code: string; isActive: boolean }>,
  ): Promise<Tenant> {
    const tenant = await this.tenantsRepository.updateTenant(id, data);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findSitesByTenant(tenantId: string): Promise<Site[]> {
    return this.tenantsRepository.findSitesByTenant(tenantId);
  }

  async findSiteById(id: string): Promise<Site | null> {
    return this.tenantsRepository.findSiteById(id);
  }

  async createSite(data: {
    tenantId: string;
    name: string;
    code?: string;
  }): Promise<Site> {
    return this.tenantsRepository.createSite(data);
  }

  async updateSite(
    id: string,
    data: Partial<{ name: string; code: string; isActive: boolean }>,
  ): Promise<Site> {
    const site = await this.tenantsRepository.updateSite(id, data);
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    return site;
  }
}
