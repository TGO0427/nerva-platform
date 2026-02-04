import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import {
  MasterDataRepository,
  Item,
  Customer,
  Supplier,
  Warehouse,
  Bin,
} from './masterdata.repository';
import { buildPaginatedResult, normalizePagination, PaginationParams } from '../../common/utils/pagination';

@Injectable()
export class MasterDataService {
  constructor(private readonly repository: MasterDataRepository) {}

  // Items
  async listItems(tenantId: string, params: PaginationParams & { search?: string }) {
    const { page, limit, offset } = normalizePagination(params);
    const [items, total] = await Promise.all([
      this.repository.findItems(tenantId, limit, offset, params.search),
      this.repository.countItems(tenantId, params.search),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async getItem(id: string): Promise<Item> {
    const item = await this.repository.findItemById(id);
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async createItem(data: {
    tenantId: string;
    sku: string;
    description: string;
    uom?: string;
    weightKg?: number;
  }): Promise<Item> {
    const existing = await this.repository.findItemBySku(data.tenantId, data.sku);
    if (existing) throw new ConflictException('SKU already exists');
    return this.repository.createItem(data);
  }

  async updateItem(
    id: string,
    data: Partial<{ sku: string; description: string; uom: string; weightKg: number; isActive: boolean }>,
  ): Promise<Item> {
    const item = await this.repository.updateItem(id, data);
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  // Customers
  async listCustomers(tenantId: string, params: PaginationParams & { search?: string }) {
    const { page, limit, offset } = normalizePagination(params);
    const customers = await this.repository.findCustomers(tenantId, limit, offset, params.search);
    return { data: customers, meta: { page, limit } };
  }

  async getCustomer(id: string): Promise<Customer> {
    const customer = await this.repository.findCustomerById(id);
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async createCustomer(data: {
    tenantId: string;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    vatNo?: string;
  }): Promise<Customer> {
    return this.repository.createCustomer(data);
  }

  // Suppliers
  async listSuppliers(tenantId: string, params: PaginationParams & { search?: string }) {
    const { page, limit, offset } = normalizePagination(params);
    const suppliers = await this.repository.findSuppliers(tenantId, limit, offset, params.search);
    return { data: suppliers, meta: { page, limit } };
  }

  async getSupplier(id: string): Promise<Supplier> {
    const supplier = await this.repository.findSupplierById(id);
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async createSupplier(data: {
    tenantId: string;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    vatNo?: string;
    contactPerson?: string;
    registrationNo?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    tradingAddressLine1?: string;
    tradingAddressLine2?: string;
    tradingCity?: string;
    tradingPostalCode?: string;
    tradingCountry?: string;
  }): Promise<Supplier> {
    return this.repository.createSupplier(data);
  }

  async updateSupplier(
    id: string,
    data: Partial<{
      code: string;
      name: string;
      email: string;
      phone: string;
      vatNo: string;
      contactPerson: string;
      registrationNo: string;
      addressLine1: string;
      addressLine2: string;
      city: string;
      postalCode: string;
      country: string;
      tradingAddressLine1: string;
      tradingAddressLine2: string;
      tradingCity: string;
      tradingPostalCode: string;
      tradingCountry: string;
      isActive: boolean;
    }>,
  ): Promise<Supplier> {
    const supplier = await this.repository.updateSupplier(id, data);
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  // Warehouses
  async listWarehouses(tenantId: string, siteId?: string): Promise<Warehouse[]> {
    return this.repository.findWarehouses(tenantId, siteId);
  }

  async getWarehouse(id: string): Promise<Warehouse> {
    const warehouse = await this.repository.findWarehouseById(id);
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async createWarehouse(data: {
    tenantId: string;
    siteId: string;
    name: string;
    code?: string;
  }): Promise<Warehouse> {
    return this.repository.createWarehouse(data);
  }

  // Bins
  async listBins(tenantId: string, warehouseId: string): Promise<Bin[]> {
    return this.repository.findBins(tenantId, warehouseId);
  }

  async getBin(id: string): Promise<Bin> {
    const bin = await this.repository.findBinById(id);
    if (!bin) throw new NotFoundException('Bin not found');
    return bin;
  }

  async createBin(data: {
    tenantId: string;
    warehouseId: string;
    code: string;
    binType?: string;
    aisle?: string;
    rack?: string;
    level?: string;
  }): Promise<Bin> {
    return this.repository.createBin(data);
  }
}
