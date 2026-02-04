import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface Item {
  id: string;
  tenantId: string;
  sku: string;
  description: string;
  uom: string;
  weightKg: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  tenantId: string;
  code: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  vatNo: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  tenantId: string;
  code: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  vatNo: string | null;
  contactPerson: string | null;
  registrationNo: string | null;
  // Postal Address
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  // Trading Address
  tradingAddressLine1: string | null;
  tradingAddressLine2: string | null;
  tradingCity: string | null;
  tradingPostalCode: string | null;
  tradingCountry: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierContact {
  id: string;
  tenantId: string;
  supplierId: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierNote {
  id: string;
  tenantId: string;
  supplierId: string;
  content: string;
  createdBy: string | null;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierNcr {
  id: string;
  tenantId: string;
  supplierId: string;
  ncrNo: string;
  ncrType: string;
  status: string;
  description: string;
  resolution: string | null;
  createdBy: string | null;
  createdByName?: string;
  resolvedBy: string | null;
  resolvedByName?: string;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface Warehouse {
  id: string;
  tenantId: string;
  siteId: string;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bin {
  id: string;
  tenantId: string;
  warehouseId: string;
  code: string;
  binType: string;
  aisle: string | null;
  rack: string | null;
  level: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MasterDataRepository extends BaseRepository {
  // Items
  async findItems(
    tenantId: string,
    limit: number,
    offset: number,
    search?: string,
  ): Promise<Item[]> {
    let sql = 'SELECT * FROM items WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];

    if (search) {
      sql += ' AND (sku ILIKE $2 OR description ILIKE $2)';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY sku LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapItem);
  }

  async countItems(tenantId: string, search?: string): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM items WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];

    if (search) {
      sql += ' AND (sku ILIKE $2 OR description ILIKE $2)';
      params.push(`%${search}%`);
    }

    const result = await this.queryOne<{ count: string }>(sql, params);
    return parseInt(result?.count || '0', 10);
  }

  async findItemById(id: string): Promise<Item | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM items WHERE id = $1',
      [id],
    );
    return row ? this.mapItem(row) : null;
  }

  async findItemBySku(tenantId: string, sku: string): Promise<Item | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM items WHERE tenant_id = $1 AND sku = $2',
      [tenantId, sku],
    );
    return row ? this.mapItem(row) : null;
  }

  async createItem(data: {
    tenantId: string;
    sku: string;
    description: string;
    uom?: string;
    weightKg?: number;
  }): Promise<Item> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO items (tenant_id, sku, description, uom, weight_kg)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.tenantId, data.sku, data.description, data.uom || 'EA', data.weightKg || null],
    );
    return this.mapItem(row!);
  }

  async updateItem(
    id: string,
    data: Partial<{ sku: string; description: string; uom: string; weightKg: number; isActive: boolean }>,
  ): Promise<Item | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.sku !== undefined) { fields.push(`sku = $${idx++}`); values.push(data.sku); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
    if (data.uom !== undefined) { fields.push(`uom = $${idx++}`); values.push(data.uom); }
    if (data.weightKg !== undefined) { fields.push(`weight_kg = $${idx++}`); values.push(data.weightKg); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.isActive); }

    if (fields.length === 0) return this.findItemById(id);

    values.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE items SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return row ? this.mapItem(row) : null;
  }

  // Customers
  async findCustomers(tenantId: string, limit: number, offset: number, search?: string): Promise<Customer[]> {
    let sql = 'SELECT * FROM customers WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];

    if (search) {
      sql += ' AND (name ILIKE $2 OR code ILIKE $2)';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY name LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapCustomer);
  }

  async findCustomerById(id: string): Promise<Customer | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM customers WHERE id = $1',
      [id],
    );
    return row ? this.mapCustomer(row) : null;
  }

  async createCustomer(data: {
    tenantId: string;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    vatNo?: string;
  }): Promise<Customer> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO customers (tenant_id, code, name, email, phone, vat_no)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.tenantId, data.code || null, data.name, data.email || null, data.phone || null, data.vatNo || null],
    );
    return this.mapCustomer(row!);
  }

  // Suppliers
  async findSuppliers(tenantId: string, limit: number, offset: number, search?: string): Promise<Supplier[]> {
    let sql = 'SELECT * FROM suppliers WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];

    if (search) {
      sql += ' AND (name ILIKE $2 OR code ILIKE $2)';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY name LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapSupplier);
  }

  async findSupplierById(id: string): Promise<Supplier | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM suppliers WHERE id = $1',
      [id],
    );
    return row ? this.mapSupplier(row) : null;
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
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO suppliers (
        tenant_id, code, name, email, phone, vat_no, contact_person, registration_no,
        address_line1, address_line2, city, postal_code, country,
        trading_address_line1, trading_address_line2, trading_city, trading_postal_code, trading_country
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        data.tenantId,
        data.code || null,
        data.name,
        data.email || null,
        data.phone || null,
        data.vatNo || null,
        data.contactPerson || null,
        data.registrationNo || null,
        data.addressLine1 || null,
        data.addressLine2 || null,
        data.city || null,
        data.postalCode || null,
        data.country || null,
        data.tradingAddressLine1 || null,
        data.tradingAddressLine2 || null,
        data.tradingCity || null,
        data.tradingPostalCode || null,
        data.tradingCountry || null,
      ],
    );
    return this.mapSupplier(row!);
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
  ): Promise<Supplier | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.code !== undefined) { fields.push(`code = $${idx++}`); values.push(data.code); }
    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.email !== undefined) { fields.push(`email = $${idx++}`); values.push(data.email); }
    if (data.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(data.phone); }
    if (data.vatNo !== undefined) { fields.push(`vat_no = $${idx++}`); values.push(data.vatNo); }
    if (data.contactPerson !== undefined) { fields.push(`contact_person = $${idx++}`); values.push(data.contactPerson); }
    if (data.registrationNo !== undefined) { fields.push(`registration_no = $${idx++}`); values.push(data.registrationNo); }
    if (data.addressLine1 !== undefined) { fields.push(`address_line1 = $${idx++}`); values.push(data.addressLine1); }
    if (data.addressLine2 !== undefined) { fields.push(`address_line2 = $${idx++}`); values.push(data.addressLine2); }
    if (data.city !== undefined) { fields.push(`city = $${idx++}`); values.push(data.city); }
    if (data.postalCode !== undefined) { fields.push(`postal_code = $${idx++}`); values.push(data.postalCode); }
    if (data.country !== undefined) { fields.push(`country = $${idx++}`); values.push(data.country); }
    if (data.tradingAddressLine1 !== undefined) { fields.push(`trading_address_line1 = $${idx++}`); values.push(data.tradingAddressLine1); }
    if (data.tradingAddressLine2 !== undefined) { fields.push(`trading_address_line2 = $${idx++}`); values.push(data.tradingAddressLine2); }
    if (data.tradingCity !== undefined) { fields.push(`trading_city = $${idx++}`); values.push(data.tradingCity); }
    if (data.tradingPostalCode !== undefined) { fields.push(`trading_postal_code = $${idx++}`); values.push(data.tradingPostalCode); }
    if (data.tradingCountry !== undefined) { fields.push(`trading_country = $${idx++}`); values.push(data.tradingCountry); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.isActive); }

    if (fields.length === 0) return this.findSupplierById(id);

    values.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE suppliers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return row ? this.mapSupplier(row) : null;
  }

  // Supplier Contacts
  async findSupplierContacts(supplierId: string): Promise<SupplierContact[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      'SELECT * FROM supplier_contacts WHERE supplier_id = $1 ORDER BY is_primary DESC, name',
      [supplierId],
    );
    return rows.map(this.mapSupplierContact);
  }

  async findSupplierContactById(id: string): Promise<SupplierContact | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM supplier_contacts WHERE id = $1',
      [id],
    );
    return row ? this.mapSupplierContact(row) : null;
  }

  async createSupplierContact(data: {
    tenantId: string;
    supplierId: string;
    name: string;
    email?: string;
    phone?: string;
    title?: string;
    isPrimary?: boolean;
  }): Promise<SupplierContact> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO supplier_contacts (tenant_id, supplier_id, name, email, phone, title, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.tenantId,
        data.supplierId,
        data.name,
        data.email || null,
        data.phone || null,
        data.title || null,
        data.isPrimary || false,
      ],
    );
    return this.mapSupplierContact(row!);
  }

  async updateSupplierContact(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      phone: string;
      title: string;
      isPrimary: boolean;
      isActive: boolean;
    }>,
  ): Promise<SupplierContact | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.email !== undefined) { fields.push(`email = $${idx++}`); values.push(data.email); }
    if (data.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(data.phone); }
    if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
    if (data.isPrimary !== undefined) { fields.push(`is_primary = $${idx++}`); values.push(data.isPrimary); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.isActive); }

    if (fields.length === 0) return this.findSupplierContactById(id);

    values.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE supplier_contacts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return row ? this.mapSupplierContact(row) : null;
  }

  async deleteSupplierContact(id: string): Promise<boolean> {
    const result = await this.queryOne<{ id: string }>(
      'DELETE FROM supplier_contacts WHERE id = $1 RETURNING id',
      [id],
    );
    return !!result;
  }

  // Supplier Notes
  async findSupplierNotes(supplierId: string): Promise<SupplierNote[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT sn.*, u.display_name as created_by_name
       FROM supplier_notes sn
       LEFT JOIN users u ON sn.created_by = u.id
       WHERE sn.supplier_id = $1
       ORDER BY sn.created_at DESC`,
      [supplierId],
    );
    return rows.map(this.mapSupplierNote);
  }

  async createSupplierNote(data: {
    tenantId: string;
    supplierId: string;
    content: string;
    createdBy?: string;
  }): Promise<SupplierNote> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO supplier_notes (tenant_id, supplier_id, content, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.tenantId, data.supplierId, data.content, data.createdBy || null],
    );
    return this.mapSupplierNote(row!);
  }

  async deleteSupplierNote(id: string): Promise<boolean> {
    const result = await this.queryOne<{ id: string }>(
      'DELETE FROM supplier_notes WHERE id = $1 RETURNING id',
      [id],
    );
    return !!result;
  }

  // Supplier NCRs
  async findSupplierNcrs(supplierId: string): Promise<SupplierNcr[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT sn.*,
              u1.display_name as created_by_name,
              u2.display_name as resolved_by_name
       FROM supplier_ncrs sn
       LEFT JOIN users u1 ON sn.created_by = u1.id
       LEFT JOIN users u2 ON sn.resolved_by = u2.id
       WHERE sn.supplier_id = $1
       ORDER BY sn.created_at DESC`,
      [supplierId],
    );
    return rows.map(this.mapSupplierNcr);
  }

  async findSupplierNcrById(id: string): Promise<SupplierNcr | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT sn.*,
              u1.display_name as created_by_name,
              u2.display_name as resolved_by_name
       FROM supplier_ncrs sn
       LEFT JOIN users u1 ON sn.created_by = u1.id
       LEFT JOIN users u2 ON sn.resolved_by = u2.id
       WHERE sn.id = $1`,
      [id],
    );
    return row ? this.mapSupplierNcr(row) : null;
  }

  async createSupplierNcr(data: {
    tenantId: string;
    supplierId: string;
    ncrNo: string;
    ncrType: string;
    description: string;
    createdBy?: string;
  }): Promise<SupplierNcr> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO supplier_ncrs (tenant_id, supplier_id, ncr_no, ncr_type, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.tenantId, data.supplierId, data.ncrNo, data.ncrType, data.description, data.createdBy || null],
    );
    return this.mapSupplierNcr(row!);
  }

  async updateSupplierNcr(
    id: string,
    data: Partial<{
      status: string;
      resolution: string;
      resolvedBy: string;
      resolvedAt: Date;
    }>,
  ): Promise<SupplierNcr | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
    if (data.resolution !== undefined) { fields.push(`resolution = $${idx++}`); values.push(data.resolution); }
    if (data.resolvedBy !== undefined) { fields.push(`resolved_by = $${idx++}`); values.push(data.resolvedBy); }
    if (data.resolvedAt !== undefined) { fields.push(`resolved_at = $${idx++}`); values.push(data.resolvedAt); }

    if (fields.length === 0) return this.findSupplierNcrById(id);

    values.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE supplier_ncrs SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return row ? this.mapSupplierNcr(row) : null;
  }

  async generateNcrNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM supplier_ncrs WHERE tenant_id = $1',
      [tenantId],
    );
    const count = parseInt(result?.count || '0', 10) + 1;
    return `NCR-${String(count).padStart(5, '0')}`;
  }

  // Warehouses
  async findWarehouses(tenantId: string, siteId?: string): Promise<Warehouse[]> {
    let sql = 'SELECT * FROM warehouses WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];

    if (siteId) {
      sql += ' AND site_id = $2';
      params.push(siteId);
    }

    sql += ' ORDER BY name';

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapWarehouse);
  }

  async findWarehouseById(id: string): Promise<Warehouse | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM warehouses WHERE id = $1',
      [id],
    );
    return row ? this.mapWarehouse(row) : null;
  }

  async createWarehouse(data: {
    tenantId: string;
    siteId: string;
    name: string;
    code?: string;
  }): Promise<Warehouse> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO warehouses (tenant_id, site_id, name, code)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.tenantId, data.siteId, data.name, data.code || null],
    );
    return this.mapWarehouse(row!);
  }

  // Bins
  async findBins(tenantId: string, warehouseId: string): Promise<Bin[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      'SELECT * FROM bins WHERE tenant_id = $1 AND warehouse_id = $2 ORDER BY code',
      [tenantId, warehouseId],
    );
    return rows.map(this.mapBin);
  }

  async findBinById(id: string): Promise<Bin | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM bins WHERE id = $1',
      [id],
    );
    return row ? this.mapBin(row) : null;
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
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.tenantId,
        data.warehouseId,
        data.code,
        data.binType || 'STORAGE',
        data.aisle || null,
        data.rack || null,
        data.level || null,
      ],
    );
    return this.mapBin(row!);
  }

  private mapItem(row: Record<string, unknown>): Item {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      sku: row.sku as string,
      description: row.description as string,
      uom: row.uom as string,
      weightKg: row.weight_kg as number | null,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapCustomer(row: Record<string, unknown>): Customer {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      code: row.code as string | null,
      name: row.name as string,
      email: row.email as string | null,
      phone: row.phone as string | null,
      vatNo: row.vat_no as string | null,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapSupplier(row: Record<string, unknown>): Supplier {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      code: row.code as string | null,
      name: row.name as string,
      email: row.email as string | null,
      phone: row.phone as string | null,
      vatNo: row.vat_no as string | null,
      contactPerson: row.contact_person as string | null,
      registrationNo: row.registration_no as string | null,
      addressLine1: row.address_line1 as string | null,
      addressLine2: row.address_line2 as string | null,
      city: row.city as string | null,
      postalCode: row.postal_code as string | null,
      country: row.country as string | null,
      tradingAddressLine1: row.trading_address_line1 as string | null,
      tradingAddressLine2: row.trading_address_line2 as string | null,
      tradingCity: row.trading_city as string | null,
      tradingPostalCode: row.trading_postal_code as string | null,
      tradingCountry: row.trading_country as string | null,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapWarehouse(row: Record<string, unknown>): Warehouse {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      siteId: row.site_id as string,
      name: row.name as string,
      code: row.code as string | null,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapBin(row: Record<string, unknown>): Bin {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      warehouseId: row.warehouse_id as string,
      code: row.code as string,
      binType: row.bin_type as string,
      aisle: row.aisle as string | null,
      rack: row.rack as string | null,
      level: row.level as string | null,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapSupplierContact(row: Record<string, unknown>): SupplierContact {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      supplierId: row.supplier_id as string,
      name: row.name as string,
      email: row.email as string | null,
      phone: row.phone as string | null,
      title: row.title as string | null,
      isPrimary: row.is_primary as boolean,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapSupplierNote(row: Record<string, unknown>): SupplierNote {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      supplierId: row.supplier_id as string,
      content: row.content as string,
      createdBy: row.created_by as string | null,
      createdByName: row.created_by_name as string | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapSupplierNcr(row: Record<string, unknown>): SupplierNcr {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      supplierId: row.supplier_id as string,
      ncrNo: row.ncr_no as string,
      ncrType: row.ncr_type as string,
      status: row.status as string,
      description: row.description as string,
      resolution: row.resolution as string | null,
      createdBy: row.created_by as string | null,
      createdByName: row.created_by_name as string | undefined,
      resolvedBy: row.resolved_by as string | null,
      resolvedByName: row.resolved_by_name as string | undefined,
      createdAt: row.created_at as Date,
      resolvedAt: row.resolved_at as Date | null,
    };
  }
}
