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
  // Billing Address
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingCity: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  // Shipping Address
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
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

export interface SupplierItem {
  id: string;
  tenantId: string;
  supplierId: string;
  itemId: string;
  supplierSku: string | null;
  unitCost: number | null;
  leadTimeDays: number | null;
  minOrderQty: number;
  isPreferred: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Joined fields
  itemSku?: string;
  itemDescription?: string;
}

export interface SupplierContract {
  id: string;
  tenantId: string;
  supplierId: string;
  contractNo: string;
  name: string;
  status: string;
  startDate: Date;
  endDate: Date;
  terms: string | null;
  totalValue: number | null;
  currency: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierContractLine {
  id: string;
  tenantId: string;
  contractId: string;
  itemId: string;
  unitPrice: number;
  minQty: number;
  maxQty: number | null;
  createdAt: Date;
  // Joined fields
  itemSku?: string;
  itemDescription?: string;
}

export interface CustomerContact {
  id: string;
  tenantId: string;
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerNote {
  id: string;
  tenantId: string;
  customerId: string;
  content: string;
  createdBy: string | null;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  poNo: string;
  supplierId: string;
  status: string;
  orderDate: Date;
  expectedDate: Date | null;
  shipToWarehouseId: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Joined fields
  supplierName?: string;
  warehouseName?: string;
  createdByName?: string;
  lineCount?: number;
}

export interface SupplierPerformanceStats {
  supplierId: string;
  supplierName: string;
  supplierCode: string | null;
  totalOrders: number;
  totalOrderValue: number;
  receivedOrders: number;
  openNcrs: number;
  resolvedNcrs: number;
  activeContracts: number;
  avgDeliveryDays: number | null;
  onTimeDeliveryRate: number | null;
}

export interface SupplierDashboardSummary {
  totalSuppliers: number;
  activeSuppliers: number;
  totalPOValue: number;
  avgPOValue: number;
  openNCRs: number;
  activeContracts: number;
  topSuppliersByPO: Array<{
    id: string;
    name: string;
    totalValue: number;
    poCount: number;
  }>;
  recentNCRs: Array<{
    id: string;
    ncrNo: string;
    supplierName: string;
    ncrType: string;
    status: string;
    createdAt: string;
  }>;
}

export interface PurchaseOrderLine {
  id: string;
  tenantId: string;
  purchaseOrderId: string;
  itemId: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCost: number | null;
  lineTotal: number | null;
  createdAt: Date;
  // Joined fields
  itemSku?: string;
  itemDescription?: string;
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
    billingAddressLine1?: string;
    billingAddressLine2?: string;
    billingCity?: string;
    billingPostalCode?: string;
    billingCountry?: string;
    shippingAddressLine1?: string;
    shippingAddressLine2?: string;
    shippingCity?: string;
    shippingPostalCode?: string;
    shippingCountry?: string;
  }): Promise<Customer> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO customers (
        tenant_id, code, name, email, phone, vat_no,
        billing_address_line1, billing_address_line2, billing_city, billing_postal_code, billing_country,
        shipping_address_line1, shipping_address_line2, shipping_city, shipping_postal_code, shipping_country
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        data.tenantId,
        data.code || null,
        data.name,
        data.email || null,
        data.phone || null,
        data.vatNo || null,
        data.billingAddressLine1 || null,
        data.billingAddressLine2 || null,
        data.billingCity || null,
        data.billingPostalCode || null,
        data.billingCountry || null,
        data.shippingAddressLine1 || null,
        data.shippingAddressLine2 || null,
        data.shippingCity || null,
        data.shippingPostalCode || null,
        data.shippingCountry || null,
      ],
    );
    return this.mapCustomer(row!);
  }

  async updateCustomer(
    id: string,
    data: Partial<{
      code: string;
      name: string;
      email: string;
      phone: string;
      vatNo: string;
      billingAddressLine1: string;
      billingAddressLine2: string;
      billingCity: string;
      billingPostalCode: string;
      billingCountry: string;
      shippingAddressLine1: string;
      shippingAddressLine2: string;
      shippingCity: string;
      shippingPostalCode: string;
      shippingCountry: string;
      isActive: boolean;
    }>,
  ): Promise<Customer | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.code !== undefined) { fields.push(`code = $${idx++}`); values.push(data.code); }
    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.email !== undefined) { fields.push(`email = $${idx++}`); values.push(data.email); }
    if (data.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(data.phone); }
    if (data.vatNo !== undefined) { fields.push(`vat_no = $${idx++}`); values.push(data.vatNo); }
    if (data.billingAddressLine1 !== undefined) { fields.push(`billing_address_line1 = $${idx++}`); values.push(data.billingAddressLine1); }
    if (data.billingAddressLine2 !== undefined) { fields.push(`billing_address_line2 = $${idx++}`); values.push(data.billingAddressLine2); }
    if (data.billingCity !== undefined) { fields.push(`billing_city = $${idx++}`); values.push(data.billingCity); }
    if (data.billingPostalCode !== undefined) { fields.push(`billing_postal_code = $${idx++}`); values.push(data.billingPostalCode); }
    if (data.billingCountry !== undefined) { fields.push(`billing_country = $${idx++}`); values.push(data.billingCountry); }
    if (data.shippingAddressLine1 !== undefined) { fields.push(`shipping_address_line1 = $${idx++}`); values.push(data.shippingAddressLine1); }
    if (data.shippingAddressLine2 !== undefined) { fields.push(`shipping_address_line2 = $${idx++}`); values.push(data.shippingAddressLine2); }
    if (data.shippingCity !== undefined) { fields.push(`shipping_city = $${idx++}`); values.push(data.shippingCity); }
    if (data.shippingPostalCode !== undefined) { fields.push(`shipping_postal_code = $${idx++}`); values.push(data.shippingPostalCode); }
    if (data.shippingCountry !== undefined) { fields.push(`shipping_country = $${idx++}`); values.push(data.shippingCountry); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.isActive); }

    if (fields.length === 0) return this.findCustomerById(id);

    values.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE customers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return row ? this.mapCustomer(row) : null;
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

  async updateWarehouse(id: string, data: { name?: string; code?: string; isActive?: boolean }): Promise<Warehouse> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.code !== undefined) {
      setClauses.push(`code = $${paramIndex++}`);
      params.push(data.code || null);
    }
    if (data.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      params.push(data.isActive);
    }

    if (setClauses.length === 0) {
      return this.findWarehouseById(id) as Promise<Warehouse>;
    }

    params.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE warehouses SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params,
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

  async updateBin(id: string, data: { code?: string; binType?: string; isActive?: boolean }): Promise<Bin> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.code !== undefined) {
      setClauses.push(`code = $${paramIndex++}`);
      params.push(data.code);
    }
    if (data.binType !== undefined) {
      setClauses.push(`bin_type = $${paramIndex++}`);
      params.push(data.binType);
    }
    if (data.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      params.push(data.isActive);
    }

    if (setClauses.length === 0) {
      return this.findBinById(id) as Promise<Bin>;
    }

    params.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE bins SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params,
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
      billingAddressLine1: row.billing_address_line1 as string | null,
      billingAddressLine2: row.billing_address_line2 as string | null,
      billingCity: row.billing_city as string | null,
      billingPostalCode: row.billing_postal_code as string | null,
      billingCountry: row.billing_country as string | null,
      shippingAddressLine1: row.shipping_address_line1 as string | null,
      shippingAddressLine2: row.shipping_address_line2 as string | null,
      shippingCity: row.shipping_city as string | null,
      shippingPostalCode: row.shipping_postal_code as string | null,
      shippingCountry: row.shipping_country as string | null,
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

  // Supplier Items
  async findSupplierItems(supplierId: string): Promise<SupplierItem[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT si.*, i.sku as item_sku, i.description as item_description
       FROM supplier_items si
       JOIN items i ON si.item_id = i.id
       WHERE si.supplier_id = $1 AND si.is_active = true
       ORDER BY i.sku`,
      [supplierId],
    );
    return rows.map(this.mapSupplierItem);
  }

  async findSupplierItemById(id: string): Promise<SupplierItem | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT si.*, i.sku as item_sku, i.description as item_description
       FROM supplier_items si
       JOIN items i ON si.item_id = i.id
       WHERE si.id = $1`,
      [id],
    );
    return row ? this.mapSupplierItem(row) : null;
  }

  async createSupplierItem(data: {
    tenantId: string;
    supplierId: string;
    itemId: string;
    supplierSku?: string;
    unitCost?: number;
    leadTimeDays?: number;
    minOrderQty?: number;
    isPreferred?: boolean;
  }): Promise<SupplierItem> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO supplier_items (tenant_id, supplier_id, item_id, supplier_sku, unit_cost, lead_time_days, min_order_qty, is_preferred)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.tenantId,
        data.supplierId,
        data.itemId,
        data.supplierSku || null,
        data.unitCost || null,
        data.leadTimeDays || null,
        data.minOrderQty || 1,
        data.isPreferred || false,
      ],
    );
    return this.mapSupplierItem(row!);
  }

  async updateSupplierItem(
    id: string,
    data: Partial<{
      supplierSku: string;
      unitCost: number;
      leadTimeDays: number;
      minOrderQty: number;
      isPreferred: boolean;
      isActive: boolean;
    }>,
  ): Promise<SupplierItem | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.supplierSku !== undefined) { fields.push(`supplier_sku = $${idx++}`); values.push(data.supplierSku); }
    if (data.unitCost !== undefined) { fields.push(`unit_cost = $${idx++}`); values.push(data.unitCost); }
    if (data.leadTimeDays !== undefined) { fields.push(`lead_time_days = $${idx++}`); values.push(data.leadTimeDays); }
    if (data.minOrderQty !== undefined) { fields.push(`min_order_qty = $${idx++}`); values.push(data.minOrderQty); }
    if (data.isPreferred !== undefined) { fields.push(`is_preferred = $${idx++}`); values.push(data.isPreferred); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.isActive); }

    if (fields.length === 0) return this.findSupplierItemById(id);

    values.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE supplier_items SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return row ? this.mapSupplierItem(row) : null;
  }

  async deleteSupplierItem(id: string): Promise<boolean> {
    const result = await this.queryOne<{ id: string }>(
      'DELETE FROM supplier_items WHERE id = $1 RETURNING id',
      [id],
    );
    return !!result;
  }

  // Supplier Contracts
  async findSupplierContracts(supplierId: string): Promise<SupplierContract[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT * FROM supplier_contracts WHERE supplier_id = $1 ORDER BY created_at DESC`,
      [supplierId],
    );
    return rows.map(this.mapSupplierContract);
  }

  async findSupplierContractById(id: string): Promise<SupplierContract | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM supplier_contracts WHERE id = $1',
      [id],
    );
    return row ? this.mapSupplierContract(row) : null;
  }

  async createSupplierContract(data: {
    tenantId: string;
    supplierId: string;
    contractNo: string;
    name: string;
    startDate: Date;
    endDate: Date;
    terms?: string;
    totalValue?: number;
    currency?: string;
    createdBy?: string;
  }): Promise<SupplierContract> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO supplier_contracts (tenant_id, supplier_id, contract_no, name, start_date, end_date, terms, total_value, currency, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.tenantId,
        data.supplierId,
        data.contractNo,
        data.name,
        data.startDate,
        data.endDate,
        data.terms || null,
        data.totalValue || null,
        data.currency || 'ZAR',
        data.createdBy || null,
      ],
    );
    return this.mapSupplierContract(row!);
  }

  async updateSupplierContract(
    id: string,
    data: Partial<{
      name: string;
      status: string;
      startDate: Date;
      endDate: Date;
      terms: string;
      totalValue: number;
    }>,
  ): Promise<SupplierContract | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
    if (data.startDate !== undefined) { fields.push(`start_date = $${idx++}`); values.push(data.startDate); }
    if (data.endDate !== undefined) { fields.push(`end_date = $${idx++}`); values.push(data.endDate); }
    if (data.terms !== undefined) { fields.push(`terms = $${idx++}`); values.push(data.terms); }
    if (data.totalValue !== undefined) { fields.push(`total_value = $${idx++}`); values.push(data.totalValue); }

    if (fields.length === 0) return this.findSupplierContractById(id);

    values.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE supplier_contracts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return row ? this.mapSupplierContract(row) : null;
  }

  async generateContractNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM supplier_contracts WHERE tenant_id = $1',
      [tenantId],
    );
    const count = parseInt(result?.count || '0', 10) + 1;
    return `CON-${String(count).padStart(5, '0')}`;
  }

  // Customer Contacts
  async findCustomerContacts(customerId: string): Promise<CustomerContact[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      'SELECT * FROM customer_contacts WHERE customer_id = $1 ORDER BY is_primary DESC, name',
      [customerId],
    );
    return rows.map(this.mapCustomerContact);
  }

  async findCustomerContactById(id: string): Promise<CustomerContact | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM customer_contacts WHERE id = $1',
      [id],
    );
    return row ? this.mapCustomerContact(row) : null;
  }

  async createCustomerContact(data: {
    tenantId: string;
    customerId: string;
    name: string;
    email?: string;
    phone?: string;
    title?: string;
    isPrimary?: boolean;
  }): Promise<CustomerContact> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO customer_contacts (tenant_id, customer_id, name, email, phone, title, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.tenantId,
        data.customerId,
        data.name,
        data.email || null,
        data.phone || null,
        data.title || null,
        data.isPrimary || false,
      ],
    );
    return this.mapCustomerContact(row!);
  }

  async updateCustomerContact(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      phone: string;
      title: string;
      isPrimary: boolean;
      isActive: boolean;
    }>,
  ): Promise<CustomerContact | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.email !== undefined) { fields.push(`email = $${idx++}`); values.push(data.email); }
    if (data.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(data.phone); }
    if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
    if (data.isPrimary !== undefined) { fields.push(`is_primary = $${idx++}`); values.push(data.isPrimary); }
    if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.isActive); }

    if (fields.length === 0) return this.findCustomerContactById(id);

    values.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE customer_contacts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return row ? this.mapCustomerContact(row) : null;
  }

  async deleteCustomerContact(id: string): Promise<boolean> {
    const result = await this.queryOne<{ id: string }>(
      'DELETE FROM customer_contacts WHERE id = $1 RETURNING id',
      [id],
    );
    return !!result;
  }

  // Customer Notes
  async findCustomerNotes(customerId: string): Promise<CustomerNote[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT cn.*, u.display_name as created_by_name
       FROM customer_notes cn
       LEFT JOIN users u ON cn.created_by = u.id
       WHERE cn.customer_id = $1
       ORDER BY cn.created_at DESC`,
      [customerId],
    );
    return rows.map(this.mapCustomerNote);
  }

  async createCustomerNote(data: {
    tenantId: string;
    customerId: string;
    content: string;
    createdBy?: string;
  }): Promise<CustomerNote> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO customer_notes (tenant_id, customer_id, content, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.tenantId, data.customerId, data.content, data.createdBy || null],
    );
    return this.mapCustomerNote(row!);
  }

  async deleteCustomerNote(id: string): Promise<boolean> {
    const result = await this.queryOne<{ id: string }>(
      'DELETE FROM customer_notes WHERE id = $1 RETURNING id',
      [id],
    );
    return !!result;
  }

  private mapSupplierItem(row: Record<string, unknown>): SupplierItem {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      supplierId: row.supplier_id as string,
      itemId: row.item_id as string,
      supplierSku: row.supplier_sku as string | null,
      unitCost: row.unit_cost ? parseFloat(row.unit_cost as string) : null,
      leadTimeDays: row.lead_time_days as number | null,
      minOrderQty: row.min_order_qty as number,
      isPreferred: row.is_preferred as boolean,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      itemSku: row.item_sku as string | undefined,
      itemDescription: row.item_description as string | undefined,
    };
  }

  private mapSupplierContract(row: Record<string, unknown>): SupplierContract {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      supplierId: row.supplier_id as string,
      contractNo: row.contract_no as string,
      name: row.name as string,
      status: row.status as string,
      startDate: row.start_date as Date,
      endDate: row.end_date as Date,
      terms: row.terms as string | null,
      totalValue: row.total_value ? parseFloat(row.total_value as string) : null,
      currency: row.currency as string,
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapCustomerContact(row: Record<string, unknown>): CustomerContact {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      customerId: row.customer_id as string,
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

  private mapCustomerNote(row: Record<string, unknown>): CustomerNote {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      customerId: row.customer_id as string,
      content: row.content as string,
      createdBy: row.created_by as string | null,
      createdByName: row.created_by_name as string | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  // Purchase Orders
  async findPurchaseOrders(
    tenantId: string,
    limit: number,
    offset: number,
    filters?: { status?: string; supplierId?: string; search?: string },
  ): Promise<PurchaseOrder[]> {
    let sql = `
      SELECT po.*,
             s.name as supplier_name,
             w.name as warehouse_name,
             u.display_name as created_by_name,
             (SELECT COUNT(*) FROM purchase_order_lines WHERE purchase_order_id = po.id) as line_count
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN warehouses w ON po.ship_to_warehouse_id = w.id
      LEFT JOIN users u ON po.created_by = u.id
      WHERE po.tenant_id = $1
    `;
    const params: unknown[] = [tenantId];
    let paramIdx = 2;

    if (filters?.status) {
      sql += ` AND po.status = $${paramIdx++}`;
      params.push(filters.status);
    }
    if (filters?.supplierId) {
      sql += ` AND po.supplier_id = $${paramIdx++}`;
      params.push(filters.supplierId);
    }
    if (filters?.search) {
      sql += ` AND (po.po_no ILIKE $${paramIdx++} OR s.name ILIKE $${paramIdx++})`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
      paramIdx++;
    }

    sql += ` ORDER BY po.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapPurchaseOrder);
  }

  async countPurchaseOrders(tenantId: string, filters?: { status?: string; supplierId?: string; search?: string }): Promise<number> {
    let sql = `
      SELECT COUNT(*) as count
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.tenant_id = $1
    `;
    const params: unknown[] = [tenantId];
    let paramIdx = 2;

    if (filters?.status) {
      sql += ` AND po.status = $${paramIdx++}`;
      params.push(filters.status);
    }
    if (filters?.supplierId) {
      sql += ` AND po.supplier_id = $${paramIdx++}`;
      params.push(filters.supplierId);
    }
    if (filters?.search) {
      sql += ` AND (po.po_no ILIKE $${paramIdx++} OR s.name ILIKE $${paramIdx++})`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const result = await this.queryOne<{ count: string }>(sql, params);
    return parseInt(result?.count || '0', 10);
  }

  async findPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT po.*,
              s.name as supplier_name,
              w.name as warehouse_name,
              u.display_name as created_by_name,
              (SELECT COUNT(*) FROM purchase_order_lines WHERE purchase_order_id = po.id) as line_count
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN warehouses w ON po.ship_to_warehouse_id = w.id
       LEFT JOIN users u ON po.created_by = u.id
       WHERE po.id = $1`,
      [id],
    );
    return row ? this.mapPurchaseOrder(row) : null;
  }

  async createPurchaseOrder(data: {
    tenantId: string;
    supplierId: string;
    poNo: string;
    orderDate?: Date;
    expectedDate?: Date;
    shipToWarehouseId?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<PurchaseOrder> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO purchase_orders (
        tenant_id, supplier_id, po_no, order_date, expected_date, ship_to_warehouse_id, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.tenantId,
        data.supplierId,
        data.poNo,
        data.orderDate || new Date(),
        data.expectedDate || null,
        data.shipToWarehouseId || null,
        data.notes || null,
        data.createdBy || null,
      ],
    );
    return this.mapPurchaseOrder(row!);
  }

  async updatePurchaseOrder(
    id: string,
    data: Partial<{
      status: string;
      expectedDate: Date;
      shipToWarehouseId: string;
      subtotal: number;
      taxAmount: number;
      totalAmount: number;
      notes: string;
    }>,
  ): Promise<PurchaseOrder | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
    if (data.expectedDate !== undefined) { fields.push(`expected_date = $${idx++}`); values.push(data.expectedDate); }
    if (data.shipToWarehouseId !== undefined) { fields.push(`ship_to_warehouse_id = $${idx++}`); values.push(data.shipToWarehouseId); }
    if (data.subtotal !== undefined) { fields.push(`subtotal = $${idx++}`); values.push(data.subtotal); }
    if (data.taxAmount !== undefined) { fields.push(`tax_amount = $${idx++}`); values.push(data.taxAmount); }
    if (data.totalAmount !== undefined) { fields.push(`total_amount = $${idx++}`); values.push(data.totalAmount); }
    if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }

    if (fields.length === 0) return this.findPurchaseOrderById(id);

    values.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE purchase_orders SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return row ? this.mapPurchaseOrder(row) : null;
  }

  async generatePoNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM purchase_orders WHERE tenant_id = $1',
      [tenantId],
    );
    const count = parseInt(result?.count || '0', 10) + 1;
    return `PO-${String(count).padStart(5, '0')}`;
  }

  // Purchase Order Lines
  async findPurchaseOrderLines(purchaseOrderId: string): Promise<PurchaseOrderLine[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT pol.*, i.sku as item_sku, i.description as item_description
       FROM purchase_order_lines pol
       JOIN items i ON pol.item_id = i.id
       WHERE pol.purchase_order_id = $1
       ORDER BY pol.created_at`,
      [purchaseOrderId],
    );
    return rows.map(this.mapPurchaseOrderLine);
  }

  async createPurchaseOrderLine(data: {
    tenantId: string;
    purchaseOrderId: string;
    itemId: string;
    qtyOrdered: number;
    unitCost?: number;
  }): Promise<PurchaseOrderLine> {
    const lineTotal = data.unitCost ? data.qtyOrdered * data.unitCost : null;
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO purchase_order_lines (tenant_id, purchase_order_id, item_id, qty_ordered, unit_cost)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.tenantId, data.purchaseOrderId, data.itemId, data.qtyOrdered, data.unitCost || null],
    );
    return this.mapPurchaseOrderLine(row!);
  }

  async updatePurchaseOrderLine(
    id: string,
    data: Partial<{ qtyOrdered: number; qtyReceived: number; unitCost: number }>,
  ): Promise<PurchaseOrderLine | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.qtyOrdered !== undefined) { fields.push(`qty_ordered = $${idx++}`); values.push(data.qtyOrdered); }
    if (data.qtyReceived !== undefined) { fields.push(`qty_received = $${idx++}`); values.push(data.qtyReceived); }
    if (data.unitCost !== undefined) { fields.push(`unit_cost = $${idx++}`); values.push(data.unitCost); }

    if (fields.length === 0) return null;

    values.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE purchase_order_lines SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return row ? this.mapPurchaseOrderLine(row) : null;
  }

  async deletePurchaseOrderLine(id: string): Promise<boolean> {
    const result = await this.queryOne<{ id: string }>(
      'DELETE FROM purchase_order_lines WHERE id = $1 RETURNING id',
      [id],
    );
    return !!result;
  }

  private mapPurchaseOrder(row: Record<string, unknown>): PurchaseOrder {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      poNo: row.po_no as string,
      supplierId: row.supplier_id as string,
      status: row.status as string,
      orderDate: row.order_date as Date,
      expectedDate: row.expected_date as Date | null,
      shipToWarehouseId: row.ship_to_warehouse_id as string | null,
      subtotal: row.subtotal ? parseFloat(row.subtotal as string) : 0,
      taxAmount: row.tax_amount ? parseFloat(row.tax_amount as string) : 0,
      totalAmount: row.total_amount ? parseFloat(row.total_amount as string) : 0,
      notes: row.notes as string | null,
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      supplierName: row.supplier_name as string | undefined,
      warehouseName: row.warehouse_name as string | undefined,
      createdByName: row.created_by_name as string | undefined,
      lineCount: row.line_count ? parseInt(row.line_count as string, 10) : undefined,
    };
  }

  private mapPurchaseOrderLine(row: Record<string, unknown>): PurchaseOrderLine {
    const qtyOrdered = row.qty_ordered ? parseFloat(row.qty_ordered as string) : 0;
    const unitCost = row.unit_cost ? parseFloat(row.unit_cost as string) : null;
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      purchaseOrderId: row.purchase_order_id as string,
      itemId: row.item_id as string,
      qtyOrdered,
      qtyReceived: row.qty_received ? parseFloat(row.qty_received as string) : 0,
      unitCost,
      lineTotal: unitCost ? qtyOrdered * unitCost : null,
      createdAt: row.created_at as Date,
      itemSku: row.item_sku as string | undefined,
      itemDescription: row.item_description as string | undefined,
    };
  }

  // Supplier Performance Analytics
  async getSupplierDashboardSummary(tenantId: string): Promise<SupplierDashboardSummary> {
    // Get basic stats
    const result = await this.queryOne<Record<string, unknown>>(
      `SELECT
        (SELECT COUNT(*) FROM suppliers WHERE tenant_id = $1) as total_suppliers,
        (SELECT COUNT(*) FROM suppliers WHERE tenant_id = $1 AND is_active = true) as active_suppliers,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders WHERE tenant_id = $1) as total_po_value,
        (SELECT COUNT(*) FROM purchase_orders WHERE tenant_id = $1) as total_pos,
        (SELECT COUNT(*) FROM supplier_ncrs WHERE tenant_id = $1 AND status IN ('OPEN', 'IN_PROGRESS')) as open_ncrs,
        (SELECT COUNT(*) FROM supplier_contracts WHERE tenant_id = $1 AND status = 'ACTIVE') as active_contracts
      `,
      [tenantId],
    );

    const totalPOs = parseInt(result?.total_pos as string || '0', 10);
    const totalPOValue = parseFloat(result?.total_po_value as string || '0');

    // Get top suppliers by PO value
    const topSuppliers = await this.queryMany<Record<string, unknown>>(
      `SELECT
        s.id,
        s.name,
        COUNT(po.id) as po_count,
        COALESCE(SUM(po.total_amount), 0) as total_value
      FROM suppliers s
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.tenant_id = $1
      WHERE s.tenant_id = $1 AND s.is_active = true
      GROUP BY s.id, s.name
      HAVING COUNT(po.id) > 0
      ORDER BY total_value DESC
      LIMIT 5`,
      [tenantId],
    );

    // Get recent NCRs
    const recentNCRs = await this.queryMany<Record<string, unknown>>(
      `SELECT
        n.id,
        n.ncr_no,
        s.name as supplier_name,
        n.ncr_type,
        n.status,
        n.created_at
      FROM supplier_ncrs n
      JOIN suppliers s ON n.supplier_id = s.id
      WHERE n.tenant_id = $1
      ORDER BY n.created_at DESC
      LIMIT 5`,
      [tenantId],
    );

    return {
      totalSuppliers: parseInt(result?.total_suppliers as string || '0', 10),
      activeSuppliers: parseInt(result?.active_suppliers as string || '0', 10),
      totalPOValue,
      avgPOValue: totalPOs > 0 ? totalPOValue / totalPOs : 0,
      openNCRs: parseInt(result?.open_ncrs as string || '0', 10),
      activeContracts: parseInt(result?.active_contracts as string || '0', 10),
      topSuppliersByPO: topSuppliers.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        totalValue: parseFloat(row.total_value as string || '0'),
        poCount: parseInt(row.po_count as string, 10),
      })),
      recentNCRs: recentNCRs.map((row) => ({
        id: row.id as string,
        ncrNo: row.ncr_no as string,
        supplierName: row.supplier_name as string,
        ncrType: row.ncr_type as string,
        status: row.status as string,
        createdAt: (row.created_at as Date).toISOString(),
      })),
    };
  }

  async getSupplierPerformanceStats(
    tenantId: string,
    options: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;
    const sortOrder = options.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Map frontend sort column names to SQL columns
    const sortColumnMap: Record<string, string> = {
      totalPOs: 'total_orders',
      totalPOValue: 'total_order_value',
      avgPOValue: 'avg_order_value',
      totalNCRs: 'total_ncrs',
      ncrRate: 'ncr_rate',
      name: 's.name',
    };
    const sortColumn = sortColumnMap[options.sortBy || 'totalPOValue'] || 'total_order_value';

    // Get total count
    const countResult = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM suppliers WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );
    const total = parseInt(countResult?.count || '0', 10);

    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT
        s.id,
        s.name,
        s.code,
        COALESCE(po_stats.total_orders, 0) as total_orders,
        COALESCE(po_stats.total_value, 0) as total_order_value,
        CASE WHEN COALESCE(po_stats.total_orders, 0) > 0
             THEN COALESCE(po_stats.total_value, 0) / COALESCE(po_stats.total_orders, 1)
             ELSE 0 END as avg_order_value,
        COALESCE(ncr_stats.open_ncrs, 0) as open_ncrs,
        COALESCE(ncr_stats.resolved_ncrs, 0) as closed_ncrs,
        COALESCE(ncr_stats.open_ncrs, 0) + COALESCE(ncr_stats.resolved_ncrs, 0) as total_ncrs,
        CASE WHEN COALESCE(po_stats.total_orders, 0) > 0
             THEN (COALESCE(ncr_stats.open_ncrs, 0) + COALESCE(ncr_stats.resolved_ncrs, 0))::float / COALESCE(po_stats.total_orders, 1) * 100
             ELSE 0 END as ncr_rate,
        COALESCE(contract_stats.active_contracts, 0) as active_contracts,
        po_stats.last_po_date
      FROM suppliers s
      LEFT JOIN (
        SELECT supplier_id,
               COUNT(*) as total_orders,
               SUM(total_amount) as total_value,
               MAX(order_date) as last_po_date
        FROM purchase_orders
        WHERE tenant_id = $1
        GROUP BY supplier_id
      ) po_stats ON s.id = po_stats.supplier_id
      LEFT JOIN (
        SELECT supplier_id,
               SUM(CASE WHEN status IN ('OPEN', 'IN_PROGRESS') THEN 1 ELSE 0 END) as open_ncrs,
               SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved_ncrs
        FROM supplier_ncrs
        WHERE tenant_id = $1
        GROUP BY supplier_id
      ) ncr_stats ON s.id = ncr_stats.supplier_id
      LEFT JOIN (
        SELECT supplier_id, COUNT(*) as active_contracts
        FROM supplier_contracts
        WHERE tenant_id = $1 AND status = 'ACTIVE'
        GROUP BY supplier_id
      ) contract_stats ON s.id = contract_stats.supplier_id
      WHERE s.tenant_id = $1 AND s.is_active = true
      ORDER BY ${sortColumn} ${sortOrder} NULLS LAST
      LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset],
    );

    const data = rows.map((row) => ({
      id: row.id as string,
      code: row.code as string | null,
      name: row.name as string,
      totalPOs: parseInt(row.total_orders as string, 10),
      totalPOValue: parseFloat(row.total_order_value as string || '0'),
      avgPOValue: parseFloat(row.avg_order_value as string || '0'),
      openNCRs: parseInt(row.open_ncrs as string, 10),
      closedNCRs: parseInt(row.closed_ncrs as string, 10),
      totalNCRs: parseInt(row.total_ncrs as string, 10),
      ncrRate: parseFloat(row.ncr_rate as string || '0'),
      activeContracts: parseInt(row.active_contracts as string, 10),
      lastPODate: row.last_po_date ? (row.last_po_date as Date).toISOString() : null,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getNcrTrendsByMonth(tenantId: string, months: number = 12): Promise<{ month: string; count: number }[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `WITH month_series AS (
        SELECT generate_series(
          DATE_TRUNC('month', NOW() - INTERVAL '${months - 1} months'),
          DATE_TRUNC('month', NOW()),
          '1 month'::interval
        ) as month
      )
      SELECT
        TO_CHAR(ms.month, 'YYYY-MM') as month,
        COALESCE(COUNT(n.id), 0) as ncr_count
      FROM month_series ms
      LEFT JOIN supplier_ncrs n ON DATE_TRUNC('month', n.created_at) = ms.month AND n.tenant_id = $1
      GROUP BY ms.month
      ORDER BY ms.month ASC`,
      [tenantId],
    );

    return rows.map((row) => ({
      month: row.month as string,
      count: parseInt(row.ncr_count as string, 10),
    }));
  }

  async getPurchaseOrderTrendsByMonth(tenantId: string, months: number = 12): Promise<{ month: string; count: number; value: number }[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `WITH month_series AS (
        SELECT generate_series(
          DATE_TRUNC('month', NOW() - INTERVAL '${months - 1} months'),
          DATE_TRUNC('month', NOW()),
          '1 month'::interval
        ) as month
      )
      SELECT
        TO_CHAR(ms.month, 'YYYY-MM') as month,
        COALESCE(COUNT(po.id), 0) as order_count,
        COALESCE(SUM(po.total_amount), 0) as total_value
      FROM month_series ms
      LEFT JOIN purchase_orders po ON DATE_TRUNC('month', po.created_at) = ms.month AND po.tenant_id = $1
      GROUP BY ms.month
      ORDER BY ms.month ASC`,
      [tenantId],
    );

    return rows.map((row) => ({
      month: row.month as string,
      count: parseInt(row.order_count as string, 10),
      value: parseFloat(row.total_value as string || '0'),
    }));
  }

  // Customer Performance Analytics
  async getCustomerDashboardSummary(tenantId: string): Promise<CustomerDashboardSummary> {
    const result = await this.queryOne<Record<string, unknown>>(
      `SELECT
        (SELECT COUNT(*) FROM customers WHERE tenant_id = $1) as total_customers,
        (SELECT COUNT(*) FROM customers WHERE tenant_id = $1 AND is_active = true) as active_customers,
        (SELECT COALESCE(SUM(total_amount), 0) FROM sales_orders WHERE tenant_id = $1) as total_sales_value,
        (SELECT COUNT(*) FROM sales_orders WHERE tenant_id = $1) as total_orders,
        (SELECT COUNT(*) FROM sales_orders WHERE tenant_id = $1 AND status IN ('DRAFT', 'CONFIRMED', 'ALLOCATED')) as pending_orders
      `,
      [tenantId],
    );

    const totalOrders = parseInt(result?.total_orders as string || '0', 10);
    const totalSalesValue = parseFloat(result?.total_sales_value as string || '0');

    const topCustomers = await this.queryMany<Record<string, unknown>>(
      `SELECT
        c.id,
        c.name,
        COUNT(so.id) as order_count,
        COALESCE(SUM(so.total_amount), 0) as total_value
      FROM customers c
      LEFT JOIN sales_orders so ON c.id = so.customer_id AND so.tenant_id = $1
      WHERE c.tenant_id = $1 AND c.is_active = true
      GROUP BY c.id, c.name
      HAVING COUNT(so.id) > 0
      ORDER BY total_value DESC
      LIMIT 5`,
      [tenantId],
    );

    const recentOrders = await this.queryMany<Record<string, unknown>>(
      `SELECT
        so.id,
        so.so_no,
        c.name as customer_name,
        so.total_amount,
        so.status,
        so.created_at
      FROM sales_orders so
      JOIN customers c ON so.customer_id = c.id
      WHERE so.tenant_id = $1
      ORDER BY so.created_at DESC
      LIMIT 5`,
      [tenantId],
    );

    return {
      totalCustomers: parseInt(result?.total_customers as string || '0', 10),
      activeCustomers: parseInt(result?.active_customers as string || '0', 10),
      totalSalesValue,
      avgOrderValue: totalOrders > 0 ? totalSalesValue / totalOrders : 0,
      totalOrders,
      pendingOrders: parseInt(result?.pending_orders as string || '0', 10),
      topCustomersBySales: topCustomers.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        totalValue: parseFloat(row.total_value as string || '0'),
        orderCount: parseInt(row.order_count as string, 10),
      })),
      recentOrders: recentOrders.map((row) => ({
        id: row.id as string,
        soNo: row.so_no as string,
        customerName: row.customer_name as string,
        totalAmount: parseFloat(row.total_amount as string || '0'),
        status: row.status as string,
        createdAt: (row.created_at as Date).toISOString(),
      })),
    };
  }

  async getCustomerPerformanceStats(
    tenantId: string,
    options: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;
    const sortOrder = options.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sortColumnMap: Record<string, string> = {
      totalOrders: 'total_orders',
      totalOrderValue: 'total_order_value',
      avgOrderValue: 'avg_order_value',
      name: 'c.name',
    };
    const sortColumn = sortColumnMap[options.sortBy || 'totalOrderValue'] || 'total_order_value';

    const countResult = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM customers WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );
    const total = parseInt(countResult?.count || '0', 10);

    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT
        c.id,
        c.name,
        c.code,
        COALESCE(so_stats.total_orders, 0) as total_orders,
        COALESCE(so_stats.total_value, 0) as total_order_value,
        CASE WHEN COALESCE(so_stats.total_orders, 0) > 0
             THEN COALESCE(so_stats.total_value, 0) / COALESCE(so_stats.total_orders, 1)
             ELSE 0 END as avg_order_value,
        COALESCE(so_stats.shipped_orders, 0) as shipped_orders,
        COALESCE(so_stats.cancelled_orders, 0) as cancelled_orders,
        so_stats.last_order_date
      FROM customers c
      LEFT JOIN (
        SELECT customer_id,
               COUNT(*) as total_orders,
               SUM(total_amount) as total_value,
               SUM(CASE WHEN status = 'SHIPPED' THEN 1 ELSE 0 END) as shipped_orders,
               SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_orders,
               MAX(created_at) as last_order_date
        FROM sales_orders
        WHERE tenant_id = $1
        GROUP BY customer_id
      ) so_stats ON c.id = so_stats.customer_id
      WHERE c.tenant_id = $1 AND c.is_active = true
      ORDER BY ${sortColumn} ${sortOrder} NULLS LAST
      LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset],
    );

    const data: CustomerPerformanceStats[] = rows.map((row) => ({
      id: row.id as string,
      code: row.code as string | null,
      name: row.name as string,
      totalOrders: parseInt(row.total_orders as string, 10),
      totalOrderValue: parseFloat(row.total_order_value as string || '0'),
      avgOrderValue: parseFloat(row.avg_order_value as string || '0'),
      shippedOrders: parseInt(row.shipped_orders as string, 10),
      cancelledOrders: parseInt(row.cancelled_orders as string, 10),
      lastOrderDate: row.last_order_date ? (row.last_order_date as Date).toISOString() : null,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSalesOrderTrendsByMonth(tenantId: string, months: number = 12): Promise<{ month: string; count: number; value: number }[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `WITH month_series AS (
        SELECT generate_series(
          DATE_TRUNC('month', NOW() - INTERVAL '${months - 1} months'),
          DATE_TRUNC('month', NOW()),
          '1 month'::interval
        ) as month
      )
      SELECT
        TO_CHAR(ms.month, 'YYYY-MM') as month,
        COALESCE(COUNT(so.id), 0) as order_count,
        COALESCE(SUM(so.total_amount), 0) as total_value
      FROM month_series ms
      LEFT JOIN sales_orders so ON DATE_TRUNC('month', so.created_at) = ms.month AND so.tenant_id = $1
      GROUP BY ms.month
      ORDER BY ms.month ASC`,
      [tenantId],
    );

    return rows.map((row) => ({
      month: row.month as string,
      count: parseInt(row.order_count as string, 10),
      value: parseFloat(row.total_value as string || '0'),
    }));
  }

  // Dashboard Stats
  async getDashboardStats(tenantId: string): Promise<DashboardStats> {
    const result = await this.queryOne<Record<string, unknown>>(
      `SELECT
        -- Sales Orders
        (SELECT COUNT(*) FROM sales_orders WHERE tenant_id = $1 AND status IN ('DRAFT', 'CONFIRMED')) as pending_orders,
        (SELECT COUNT(*) FROM sales_orders WHERE tenant_id = $1 AND status = 'ALLOCATED') as allocated_orders,
        (SELECT COUNT(*) FROM sales_orders WHERE tenant_id = $1 AND status = 'SHIPPED') as shipped_orders,
        -- Pick Waves & Fulfilment
        (SELECT COUNT(*) FROM pick_waves WHERE tenant_id = $1 AND status IN ('PENDING', 'IN_PROGRESS')) as active_pick_waves,
        (SELECT COUNT(*) FROM pick_tasks WHERE tenant_id = $1 AND status = 'PENDING') as pending_pick_tasks,
        -- Returns
        (SELECT COUNT(*) FROM rmas WHERE tenant_id = $1 AND status IN ('PENDING', 'RECEIVED')) as open_returns,
        -- Inventory Alerts
        (SELECT COUNT(*) FROM inventory i
         JOIN items it ON i.item_id = it.id
         WHERE i.tenant_id = $1 AND i.qty_on_hand <= COALESCE(it.reorder_point, 0)) as low_stock_items,
        (SELECT COUNT(*) FROM inventory
         WHERE tenant_id = $1 AND expiry_date IS NOT NULL AND expiry_date <= NOW() + INTERVAL '30 days') as expiring_items,
        -- Open NCRs
        (SELECT COUNT(*) FROM supplier_ncrs WHERE tenant_id = $1 AND status IN ('OPEN', 'IN_PROGRESS')) as open_ncrs,
        -- Recent Transactions
        (SELECT COALESCE(SUM(total_amount), 0) FROM sales_orders
         WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days') as weekly_sales_value,
        (SELECT COUNT(*) FROM sales_orders
         WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days') as weekly_orders_count
      `,
      [tenantId],
    );

    return {
      pendingOrders: parseInt(result?.pending_orders as string || '0', 10),
      allocatedOrders: parseInt(result?.allocated_orders as string || '0', 10),
      shippedOrders: parseInt(result?.shipped_orders as string || '0', 10),
      activePickWaves: parseInt(result?.active_pick_waves as string || '0', 10),
      pendingPickTasks: parseInt(result?.pending_pick_tasks as string || '0', 10),
      openReturns: parseInt(result?.open_returns as string || '0', 10),
      lowStockItems: parseInt(result?.low_stock_items as string || '0', 10),
      expiringItems: parseInt(result?.expiring_items as string || '0', 10),
      openNCRs: parseInt(result?.open_ncrs as string || '0', 10),
      weeklySalesValue: parseFloat(result?.weekly_sales_value as string || '0'),
      weeklyOrdersCount: parseInt(result?.weekly_orders_count as string || '0', 10),
    };
  }

  async getRecentActivity(tenantId: string, limit: number = 10): Promise<RecentActivity[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT * FROM (
        -- Sales Orders
        SELECT
          'sales_order' as type,
          id,
          so_no as reference,
          status,
          created_at,
          'Sales Order ' || so_no || ' created' as message
        FROM sales_orders
        WHERE tenant_id = $1

        UNION ALL

        -- Purchase Orders
        SELECT
          'purchase_order' as type,
          id,
          po_no as reference,
          status,
          created_at,
          'Purchase Order ' || po_no || ' created' as message
        FROM purchase_orders
        WHERE tenant_id = $1

        UNION ALL

        -- GRNs
        SELECT
          'grn' as type,
          id,
          grn_no as reference,
          status,
          created_at,
          'GRN ' || grn_no || ' received' as message
        FROM grns
        WHERE tenant_id = $1

        UNION ALL

        -- Pick Waves
        SELECT
          'pick_wave' as type,
          id,
          wave_no as reference,
          status,
          created_at,
          'Pick Wave ' || wave_no || ' created' as message
        FROM pick_waves
        WHERE tenant_id = $1
      ) combined
      ORDER BY created_at DESC
      LIMIT $2`,
      [tenantId, limit],
    );

    return rows.map((row) => ({
      type: row.type as string,
      id: row.id as string,
      reference: row.reference as string,
      status: row.status as string,
      message: row.message as string,
      createdAt: (row.created_at as Date).toISOString(),
    }));
  }

  // Reports
  async getSalesReport(tenantId: string, startDate: Date, endDate: Date) {
    const summary = await this.queryOne<Record<string, unknown>>(
      `SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_value,
        COALESCE(AVG(total_amount), 0) as avg_order_value,
        COUNT(DISTINCT customer_id) as unique_customers,
        SUM(CASE WHEN status = 'SHIPPED' THEN 1 ELSE 0 END) as shipped_orders,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_orders
      FROM sales_orders
      WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [tenantId, startDate, endDate],
    );

    const byDay = await this.queryMany<Record<string, unknown>>(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as daily_value
      FROM sales_orders
      WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
      GROUP BY DATE(created_at)
      ORDER BY date ASC`,
      [tenantId, startDate, endDate],
    );

    const topCustomers = await this.queryMany<Record<string, unknown>>(
      `SELECT
        c.id,
        c.name,
        COUNT(so.id) as order_count,
        COALESCE(SUM(so.total_amount), 0) as total_value
      FROM customers c
      JOIN sales_orders so ON c.id = so.customer_id
      WHERE so.tenant_id = $1 AND so.created_at >= $2 AND so.created_at <= $3
      GROUP BY c.id, c.name
      ORDER BY total_value DESC
      LIMIT 10`,
      [tenantId, startDate, endDate],
    );

    const topItems = await this.queryMany<Record<string, unknown>>(
      `SELECT
        i.id,
        i.sku,
        i.description,
        SUM(sol.qty_ordered) as qty_sold,
        COALESCE(SUM(sol.line_total), 0) as total_value
      FROM items i
      JOIN sales_order_lines sol ON i.id = sol.item_id
      JOIN sales_orders so ON sol.sales_order_id = so.id
      WHERE so.tenant_id = $1 AND so.created_at >= $2 AND so.created_at <= $3
      GROUP BY i.id, i.sku, i.description
      ORDER BY qty_sold DESC
      LIMIT 10`,
      [tenantId, startDate, endDate],
    );

    return {
      summary: {
        totalOrders: parseInt(summary?.total_orders as string || '0', 10),
        totalValue: parseFloat(summary?.total_value as string || '0'),
        avgOrderValue: parseFloat(summary?.avg_order_value as string || '0'),
        uniqueCustomers: parseInt(summary?.unique_customers as string || '0', 10),
        shippedOrders: parseInt(summary?.shipped_orders as string || '0', 10),
        cancelledOrders: parseInt(summary?.cancelled_orders as string || '0', 10),
      },
      byDay: byDay.map((row) => ({
        date: (row.date as Date).toISOString().split('T')[0],
        orderCount: parseInt(row.order_count as string, 10),
        dailyValue: parseFloat(row.daily_value as string || '0'),
      })),
      topCustomers: topCustomers.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        orderCount: parseInt(row.order_count as string, 10),
        totalValue: parseFloat(row.total_value as string || '0'),
      })),
      topItems: topItems.map((row) => ({
        id: row.id as string,
        sku: row.sku as string,
        description: row.description as string,
        qtySold: parseFloat(row.qty_sold as string || '0'),
        totalValue: parseFloat(row.total_value as string || '0'),
      })),
    };
  }

  async getInventoryReport(tenantId: string) {
    const summary = await this.queryOne<Record<string, unknown>>(
      `SELECT
        COUNT(DISTINCT i.item_id) as total_items,
        COALESCE(SUM(i.qty_on_hand), 0) as total_qty,
        COALESCE(SUM(i.qty_on_hand * COALESCE(it.unit_cost, 0)), 0) as total_value,
        COUNT(CASE WHEN i.qty_on_hand <= COALESCE(it.reorder_point, 0) THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN i.expiry_date IS NOT NULL AND i.expiry_date <= NOW() + INTERVAL '30 days' THEN 1 END) as expiring_count
      FROM inventory i
      JOIN items it ON i.item_id = it.id
      WHERE i.tenant_id = $1`,
      [tenantId],
    );

    const byWarehouse = await this.queryMany<Record<string, unknown>>(
      `SELECT
        w.id,
        w.name,
        w.code,
        COUNT(DISTINCT i.item_id) as item_count,
        COALESCE(SUM(i.qty_on_hand), 0) as total_qty,
        COALESCE(SUM(i.qty_on_hand * COALESCE(it.unit_cost, 0)), 0) as total_value
      FROM warehouses w
      LEFT JOIN inventory i ON w.id = i.warehouse_id
      LEFT JOIN items it ON i.item_id = it.id
      WHERE w.tenant_id = $1 AND w.is_active = true
      GROUP BY w.id, w.name, w.code
      ORDER BY total_value DESC`,
      [tenantId],
    );

    const lowStock = await this.queryMany<Record<string, unknown>>(
      `SELECT
        i.id as inventory_id,
        it.id as item_id,
        it.sku,
        it.description,
        w.name as warehouse_name,
        i.qty_on_hand,
        COALESCE(it.reorder_point, 0) as reorder_point
      FROM inventory i
      JOIN items it ON i.item_id = it.id
      JOIN warehouses w ON i.warehouse_id = w.id
      WHERE i.tenant_id = $1 AND i.qty_on_hand <= COALESCE(it.reorder_point, 0)
      ORDER BY i.qty_on_hand ASC
      LIMIT 20`,
      [tenantId],
    );

    const expiringSoon = await this.queryMany<Record<string, unknown>>(
      `SELECT
        i.id as inventory_id,
        it.id as item_id,
        it.sku,
        it.description,
        w.name as warehouse_name,
        i.qty_on_hand,
        i.batch_number,
        i.expiry_date
      FROM inventory i
      JOIN items it ON i.item_id = it.id
      JOIN warehouses w ON i.warehouse_id = w.id
      WHERE i.tenant_id = $1 AND i.expiry_date IS NOT NULL AND i.expiry_date <= NOW() + INTERVAL '30 days'
      ORDER BY i.expiry_date ASC
      LIMIT 20`,
      [tenantId],
    );

    return {
      summary: {
        totalItems: parseInt(summary?.total_items as string || '0', 10),
        totalQty: parseFloat(summary?.total_qty as string || '0'),
        totalValue: parseFloat(summary?.total_value as string || '0'),
        lowStockCount: parseInt(summary?.low_stock_count as string || '0', 10),
        expiringCount: parseInt(summary?.expiring_count as string || '0', 10),
      },
      byWarehouse: byWarehouse.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        code: row.code as string | null,
        itemCount: parseInt(row.item_count as string, 10),
        totalQty: parseFloat(row.total_qty as string || '0'),
        totalValue: parseFloat(row.total_value as string || '0'),
      })),
      lowStock: lowStock.map((row) => ({
        inventoryId: row.inventory_id as string,
        itemId: row.item_id as string,
        sku: row.sku as string,
        description: row.description as string,
        warehouseName: row.warehouse_name as string,
        qtyOnHand: parseFloat(row.qty_on_hand as string || '0'),
        reorderPoint: parseFloat(row.reorder_point as string || '0'),
      })),
      expiringSoon: expiringSoon.map((row) => ({
        inventoryId: row.inventory_id as string,
        itemId: row.item_id as string,
        sku: row.sku as string,
        description: row.description as string,
        warehouseName: row.warehouse_name as string,
        qtyOnHand: parseFloat(row.qty_on_hand as string || '0'),
        batchNumber: row.batch_number as string | null,
        expiryDate: row.expiry_date ? (row.expiry_date as Date).toISOString().split('T')[0] : null,
      })),
    };
  }

  async getProcurementReport(tenantId: string, startDate: Date, endDate: Date) {
    const summary = await this.queryOne<Record<string, unknown>>(
      `SELECT
        COUNT(*) as total_pos,
        COALESCE(SUM(total_amount), 0) as total_value,
        COALESCE(AVG(total_amount), 0) as avg_po_value,
        COUNT(DISTINCT supplier_id) as unique_suppliers,
        SUM(CASE WHEN status = 'RECEIVED' THEN 1 ELSE 0 END) as received_pos,
        SUM(CASE WHEN status IN ('DRAFT', 'SENT', 'CONFIRMED') THEN 1 ELSE 0 END) as pending_pos
      FROM purchase_orders
      WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [tenantId, startDate, endDate],
    );

    const byMonth = await this.queryMany<Record<string, unknown>>(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        COUNT(*) as po_count,
        COALESCE(SUM(total_amount), 0) as monthly_value
      FROM purchase_orders
      WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC`,
      [tenantId, startDate, endDate],
    );

    const topSuppliers = await this.queryMany<Record<string, unknown>>(
      `SELECT
        s.id,
        s.name,
        s.code,
        COUNT(po.id) as po_count,
        COALESCE(SUM(po.total_amount), 0) as total_value
      FROM suppliers s
      JOIN purchase_orders po ON s.id = po.supplier_id
      WHERE po.tenant_id = $1 AND po.created_at >= $2 AND po.created_at <= $3
      GROUP BY s.id, s.name, s.code
      ORDER BY total_value DESC
      LIMIT 10`,
      [tenantId, startDate, endDate],
    );

    const byStatus = await this.queryMany<Record<string, unknown>>(
      `SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as value
      FROM purchase_orders
      WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
      GROUP BY status
      ORDER BY count DESC`,
      [tenantId, startDate, endDate],
    );

    return {
      summary: {
        totalPOs: parseInt(summary?.total_pos as string || '0', 10),
        totalValue: parseFloat(summary?.total_value as string || '0'),
        avgPOValue: parseFloat(summary?.avg_po_value as string || '0'),
        uniqueSuppliers: parseInt(summary?.unique_suppliers as string || '0', 10),
        receivedPOs: parseInt(summary?.received_pos as string || '0', 10),
        pendingPOs: parseInt(summary?.pending_pos as string || '0', 10),
      },
      byMonth: byMonth.map((row) => ({
        month: row.month as string,
        poCount: parseInt(row.po_count as string, 10),
        monthlyValue: parseFloat(row.monthly_value as string || '0'),
      })),
      topSuppliers: topSuppliers.map((row) => ({
        id: row.id as string,
        name: row.name as string,
        code: row.code as string | null,
        poCount: parseInt(row.po_count as string, 10),
        totalValue: parseFloat(row.total_value as string || '0'),
      })),
      byStatus: byStatus.map((row) => ({
        status: row.status as string,
        count: parseInt(row.count as string, 10),
        value: parseFloat(row.value as string || '0'),
      })),
    };
  }

  // Notifications
  async listNotifications(
    tenantId: string,
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE tenant_id = $1 AND (user_id = $2 OR user_id IS NULL)';
    if (options.unreadOnly) {
      whereClause += ' AND is_read = false';
    }

    const countResult = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM notifications ${whereClause}`,
      [tenantId, userId]
    );
    const total = parseInt(countResult?.count || '0', 10);

    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT * FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [tenantId, userId, limit, offset]
    );

    const data = rows.map(this.mapNotification);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadNotificationCount(tenantId: string, userId: string): Promise<number> {
    const result = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM notifications
       WHERE tenant_id = $1 AND (user_id = $2 OR user_id IS NULL) AND is_read = false`,
      [tenantId, userId]
    );
    return parseInt(result?.count || '0', 10);
  }

  async createNotification(data: {
    tenantId: string;
    userId?: string;
    type: string;
    category: string;
    title: string;
    message: string;
    link?: string;
  }): Promise<Notification> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO notifications (tenant_id, user_id, type, category, title, message, link)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.tenantId, data.userId || null, data.type, data.category, data.title, data.message, data.link || null]
    );
    if (!row) throw new Error('Failed to create notification');
    return this.mapNotification(row);
  }

  async markNotificationAsRead(id: string): Promise<Notification | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return row ? this.mapNotification(row) : null;
  }

  async markAllNotificationsAsRead(tenantId: string, userId: string): Promise<void> {
    await this.execute(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE tenant_id = $1 AND (user_id = $2 OR user_id IS NULL) AND is_read = false`,
      [tenantId, userId]
    );
  }

  async deleteNotification(id: string): Promise<void> {
    await this.execute('DELETE FROM notifications WHERE id = $1', [id]);
  }

  private mapNotification(row: Record<string, unknown>): Notification {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string | null,
      type: row.type as string,
      category: row.category as string,
      title: row.title as string,
      message: row.message as string,
      link: row.link as string | null,
      isRead: row.is_read as boolean,
      createdAt: (row.created_at as Date).toISOString(),
      readAt: row.read_at ? (row.read_at as Date).toISOString() : null,
    };
  }
}

export interface Notification {
  id: string;
  tenantId: string;
  userId: string | null;
  type: string;
  category: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface DashboardStats {
  pendingOrders: number;
  allocatedOrders: number;
  shippedOrders: number;
  activePickWaves: number;
  pendingPickTasks: number;
  openReturns: number;
  lowStockItems: number;
  expiringItems: number;
  openNCRs: number;
  weeklySalesValue: number;
  weeklyOrdersCount: number;
}

export interface RecentActivity {
  type: string;
  id: string;
  reference: string;
  status: string;
  message: string;
  createdAt: string;
}

export interface CustomerDashboardSummary {
  totalCustomers: number;
  activeCustomers: number;
  totalSalesValue: number;
  avgOrderValue: number;
  totalOrders: number;
  pendingOrders: number;
  topCustomersBySales: Array<{
    id: string;
    name: string;
    totalValue: number;
    orderCount: number;
  }>;
  recentOrders: Array<{
    id: string;
    soNo: string;
    customerName: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
}

export interface CustomerPerformanceStats {
  id: string;
  code: string | null;
  name: string;
  totalOrders: number;
  totalOrderValue: number;
  avgOrderValue: number;
  shippedOrders: number;
  cancelledOrders: number;
  lastOrderDate: string | null;
}
