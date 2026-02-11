import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import {
  MasterDataRepository,
  Item,
  Customer,
  Supplier,
  SupplierContact,
  SupplierNote,
  SupplierNcr,
  SupplierItem,
  SupplierContract,
  CustomerContact,
  CustomerNote,
  PurchaseOrder,
  PurchaseOrderLine,
  SupplierPerformanceStats,
  SupplierDashboardSummary,
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
    return this.repository.createCustomer(data);
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
  ): Promise<Customer> {
    const customer = await this.repository.updateCustomer(id, data);
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
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

  // Supplier Contacts
  async listSupplierContacts(supplierId: string): Promise<SupplierContact[]> {
    return this.repository.findSupplierContacts(supplierId);
  }

  async getSupplierContact(id: string): Promise<SupplierContact> {
    const contact = await this.repository.findSupplierContactById(id);
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
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
    return this.repository.createSupplierContact(data);
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
  ): Promise<SupplierContact> {
    const contact = await this.repository.updateSupplierContact(id, data);
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async deleteSupplierContact(id: string): Promise<void> {
    const deleted = await this.repository.deleteSupplierContact(id);
    if (!deleted) throw new NotFoundException('Contact not found');
  }

  // Supplier Notes
  async listSupplierNotes(supplierId: string): Promise<SupplierNote[]> {
    return this.repository.findSupplierNotes(supplierId);
  }

  async createSupplierNote(data: {
    tenantId: string;
    supplierId: string;
    content: string;
    createdBy?: string;
  }): Promise<SupplierNote> {
    return this.repository.createSupplierNote(data);
  }

  async deleteSupplierNote(id: string): Promise<void> {
    const deleted = await this.repository.deleteSupplierNote(id);
    if (!deleted) throw new NotFoundException('Note not found');
  }

  // Supplier NCRs
  async listSupplierNcrs(supplierId: string): Promise<SupplierNcr[]> {
    return this.repository.findSupplierNcrs(supplierId);
  }

  async getSupplierNcr(id: string): Promise<SupplierNcr> {
    const ncr = await this.repository.findSupplierNcrById(id);
    if (!ncr) throw new NotFoundException('NCR not found');
    return ncr;
  }

  async createSupplierNcr(data: {
    tenantId: string;
    supplierId: string;
    ncrType: string;
    description: string;
    createdBy?: string;
  }): Promise<SupplierNcr> {
    const ncrNo = await this.repository.generateNcrNo(data.tenantId);
    return this.repository.createSupplierNcr({ ...data, ncrNo });
  }

  async resolveSupplierNcr(
    id: string,
    data: { resolution: string; resolvedBy: string },
  ): Promise<SupplierNcr> {
    const ncr = await this.repository.updateSupplierNcr(id, {
      status: 'RESOLVED',
      resolution: data.resolution,
      resolvedBy: data.resolvedBy,
      resolvedAt: new Date(),
    });
    if (!ncr) throw new NotFoundException('NCR not found');
    return ncr;
  }

  async updateSupplierNcrStatus(id: string, status: string): Promise<SupplierNcr> {
    const ncr = await this.repository.updateSupplierNcr(id, { status });
    if (!ncr) throw new NotFoundException('NCR not found');
    return ncr;
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

  async updateWarehouse(id: string, data: { name?: string; code?: string; isActive?: boolean }): Promise<Warehouse> {
    await this.getWarehouse(id); // throws if not found
    return this.repository.updateWarehouse(id, data);
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

  async updateBin(id: string, data: { code?: string; binType?: string; isActive?: boolean }): Promise<Bin> {
    await this.getBin(id); // throws if not found
    return this.repository.updateBin(id, data);
  }

  // Supplier Items (Products & Services)
  async listSupplierItems(supplierId: string): Promise<SupplierItem[]> {
    return this.repository.findSupplierItems(supplierId);
  }

  async getSupplierItem(id: string): Promise<SupplierItem> {
    const item = await this.repository.findSupplierItemById(id);
    if (!item) throw new NotFoundException('Supplier item not found');
    return item;
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
    return this.repository.createSupplierItem(data);
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
  ): Promise<SupplierItem> {
    const item = await this.repository.updateSupplierItem(id, data);
    if (!item) throw new NotFoundException('Supplier item not found');
    return item;
  }

  async deleteSupplierItem(id: string): Promise<void> {
    const deleted = await this.repository.deleteSupplierItem(id);
    if (!deleted) throw new NotFoundException('Supplier item not found');
  }

  // Supplier Contracts
  async listSupplierContracts(supplierId: string): Promise<SupplierContract[]> {
    return this.repository.findSupplierContracts(supplierId);
  }

  async getSupplierContract(id: string): Promise<SupplierContract> {
    const contract = await this.repository.findSupplierContractById(id);
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  async createSupplierContract(data: {
    tenantId: string;
    supplierId: string;
    name: string;
    startDate: Date;
    endDate: Date;
    terms?: string;
    totalValue?: number;
    currency?: string;
    createdBy?: string;
  }): Promise<SupplierContract> {
    const contractNo = await this.repository.generateContractNo(data.tenantId);
    return this.repository.createSupplierContract({ ...data, contractNo });
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
  ): Promise<SupplierContract> {
    const contract = await this.repository.updateSupplierContract(id, data);
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  // Customer Contacts
  async listCustomerContacts(customerId: string): Promise<CustomerContact[]> {
    return this.repository.findCustomerContacts(customerId);
  }

  async getCustomerContact(id: string): Promise<CustomerContact> {
    const contact = await this.repository.findCustomerContactById(id);
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
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
    return this.repository.createCustomerContact(data);
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
  ): Promise<CustomerContact> {
    const contact = await this.repository.updateCustomerContact(id, data);
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async deleteCustomerContact(id: string): Promise<void> {
    const deleted = await this.repository.deleteCustomerContact(id);
    if (!deleted) throw new NotFoundException('Contact not found');
  }

  // Customer Notes
  async listCustomerNotes(customerId: string): Promise<CustomerNote[]> {
    return this.repository.findCustomerNotes(customerId);
  }

  async createCustomerNote(data: {
    tenantId: string;
    customerId: string;
    content: string;
    createdBy?: string;
  }): Promise<CustomerNote> {
    return this.repository.createCustomerNote(data);
  }

  async deleteCustomerNote(id: string): Promise<void> {
    const deleted = await this.repository.deleteCustomerNote(id);
    if (!deleted) throw new NotFoundException('Note not found');
  }

  // Purchase Orders
  async listPurchaseOrders(
    tenantId: string,
    siteId: string | undefined,
    params: PaginationParams & { status?: string; supplierId?: string; search?: string },
  ) {
    const { page, limit, offset } = normalizePagination(params);
    const filters = { status: params.status, supplierId: params.supplierId, search: params.search, siteId };
    const [orders, total] = await Promise.all([
      this.repository.findPurchaseOrders(tenantId, limit, offset, filters),
      this.repository.countPurchaseOrders(tenantId, filters),
    ]);
    return buildPaginatedResult(orders, total, page, limit);
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const order = await this.repository.findPurchaseOrderById(id);
    if (!order) throw new NotFoundException('Purchase order not found');
    return order;
  }

  async createPurchaseOrder(data: {
    tenantId: string;
    siteId: string;
    supplierId: string;
    orderDate?: Date;
    expectedDate?: Date;
    shipToWarehouseId?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<PurchaseOrder> {
    const poNo = await this.repository.generatePoNo(data.tenantId);
    return this.repository.createPurchaseOrder({ ...data, poNo });
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
  ): Promise<PurchaseOrder> {
    const order = await this.repository.updatePurchaseOrder(id, data);
    if (!order) throw new NotFoundException('Purchase order not found');
    return order;
  }

  // Purchase Order Lines
  async listPurchaseOrderLines(purchaseOrderId: string): Promise<PurchaseOrderLine[]> {
    return this.repository.findPurchaseOrderLines(purchaseOrderId);
  }

  async createPurchaseOrderLine(data: {
    tenantId: string;
    purchaseOrderId: string;
    itemId: string;
    qtyOrdered: number;
    unitCost?: number;
  }): Promise<PurchaseOrderLine> {
    return this.repository.createPurchaseOrderLine(data);
  }

  async updatePurchaseOrderLine(
    id: string,
    data: Partial<{ qtyOrdered: number; qtyReceived: number; unitCost: number }>,
  ): Promise<PurchaseOrderLine> {
    const line = await this.repository.updatePurchaseOrderLine(id, data);
    if (!line) throw new NotFoundException('Purchase order line not found');
    return line;
  }

  async deletePurchaseOrderLine(id: string): Promise<void> {
    const deleted = await this.repository.deletePurchaseOrderLine(id);
    if (!deleted) throw new NotFoundException('Purchase order line not found');
  }

  async recalculatePurchaseOrderTotals(purchaseOrderId: string): Promise<PurchaseOrder> {
    const lines = await this.repository.findPurchaseOrderLines(purchaseOrderId);
    const subtotal = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
    const taxAmount = subtotal * 0.15; // 15% VAT
    const totalAmount = subtotal + taxAmount;

    const order = await this.repository.updatePurchaseOrder(purchaseOrderId, {
      subtotal,
      taxAmount,
      totalAmount,
    });
    if (!order) throw new NotFoundException('Purchase order not found');
    return order;
  }

  // Supplier Performance Analytics
  async getSupplierDashboardSummary(tenantId: string): Promise<SupplierDashboardSummary> {
    return this.repository.getSupplierDashboardSummary(tenantId);
  }

  async getSupplierPerformanceStats(
    tenantId: string,
    options: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
  ) {
    return this.repository.getSupplierPerformanceStats(tenantId, options);
  }

  async getNcrTrendsByMonth(tenantId: string, months?: number) {
    return this.repository.getNcrTrendsByMonth(tenantId, months);
  }

  async getPurchaseOrderTrendsByMonth(tenantId: string, months?: number) {
    return this.repository.getPurchaseOrderTrendsByMonth(tenantId, months);
  }

  // Customer Performance Analytics
  async getCustomerDashboardSummary(tenantId: string) {
    return this.repository.getCustomerDashboardSummary(tenantId);
  }

  async getCustomerPerformanceStats(
    tenantId: string,
    options: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
  ) {
    return this.repository.getCustomerPerformanceStats(tenantId, options);
  }

  async getSalesOrderTrendsByMonth(tenantId: string, months?: number) {
    return this.repository.getSalesOrderTrendsByMonth(tenantId, months);
  }

  // Dashboard
  async getDashboardStats(tenantId: string) {
    return this.repository.getDashboardStats(tenantId);
  }

  async getRecentActivity(tenantId: string, limit?: number) {
    return this.repository.getRecentActivity(tenantId, limit);
  }

  // Reports
  async getSalesReport(tenantId: string, startDate: Date, endDate: Date) {
    return this.repository.getSalesReport(tenantId, startDate, endDate);
  }

  async getInventoryReport(tenantId: string) {
    return this.repository.getInventoryReport(tenantId);
  }

  async getProcurementReport(tenantId: string, startDate: Date, endDate: Date) {
    return this.repository.getProcurementReport(tenantId, startDate, endDate);
  }

  // Notifications
  async listNotifications(
    tenantId: string,
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ) {
    return this.repository.listNotifications(tenantId, userId, options);
  }

  async getUnreadNotificationCount(tenantId: string, userId: string) {
    return this.repository.getUnreadNotificationCount(tenantId, userId);
  }

  async createNotification(data: {
    tenantId: string;
    userId?: string;
    type: string;
    category: string;
    title: string;
    message: string;
    link?: string;
  }) {
    return this.repository.createNotification(data);
  }

  async markNotificationAsRead(id: string) {
    return this.repository.markNotificationAsRead(id);
  }

  async markAllNotificationsAsRead(tenantId: string, userId: string) {
    return this.repository.markAllNotificationsAsRead(tenantId, userId);
  }

  async deleteNotification(id: string) {
    return this.repository.deleteNotification(id);
  }
}
