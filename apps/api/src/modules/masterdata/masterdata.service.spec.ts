import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { MasterDataService } from "./masterdata.service";
import {
  MasterDataRepository,
  Item,
  Customer,
  Supplier,
  Warehouse,
} from "./masterdata.repository";

describe("MasterDataService", () => {
  let service: MasterDataService;
  let repository: jest.Mocked<MasterDataRepository>;

  const tenantId = "tenant-123";

  const mockItem: Item = {
    id: "item-123",
    tenantId,
    sku: "SKU-001",
    description: "Test Item",
    uom: "EA",
    weightKg: 1.5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCustomer: Customer = {
    id: "customer-123",
    tenantId,
    code: "CUST-001",
    name: "Test Customer",
    email: "customer@test.com",
    phone: "123456789",
    vatNo: null,
    billingAddressLine1: "123 Main St",
    billingAddressLine2: null,
    billingCity: "Cape Town",
    billingPostalCode: "8001",
    billingCountry: "ZA",
    shippingAddressLine1: "123 Main St",
    shippingAddressLine2: null,
    shippingCity: "Cape Town",
    shippingPostalCode: "8001",
    shippingCountry: "ZA",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSupplier: Supplier = {
    id: "supplier-123",
    tenantId,
    code: "SUP-001",
    name: "Test Supplier",
    email: "supplier@test.com",
    phone: "987654321",
    vatNo: null,
    contactPerson: "John Doe",
    registrationNo: null,
    addressLine1: "456 Oak Ave",
    addressLine2: null,
    city: "Johannesburg",
    postalCode: "2000",
    country: "ZA",
    tradingAddressLine1: null,
    tradingAddressLine2: null,
    tradingCity: null,
    tradingPostalCode: null,
    tradingCountry: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWarehouse: Warehouse = {
    id: "warehouse-123",
    tenantId,
    siteId: "site-123",
    name: "Main Warehouse",
    code: "WH-001",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterDataService,
        {
          provide: MasterDataRepository,
          useValue: {
            findItems: jest.fn(),
            countItems: jest.fn(),
            findItemById: jest.fn(),
            findItemBySku: jest.fn(),
            createItem: jest.fn(),
            updateItem: jest.fn(),
            deleteItem: jest.fn(),
            countItemReferences: jest.fn(),
            bulkCreateItems: jest.fn(),
            findCustomers: jest.fn(),
            countCustomers: jest.fn(),
            findCustomerById: jest.fn(),
            createCustomer: jest.fn(),
            updateCustomer: jest.fn(),
            deleteCustomer: jest.fn(),
            countCustomerReferences: jest.fn(),
            bulkCreateCustomers: jest.fn(),
            findSuppliers: jest.fn(),
            countSuppliers: jest.fn(),
            findSupplierById: jest.fn(),
            createSupplier: jest.fn(),
            updateSupplier: jest.fn(),
            deleteSupplier: jest.fn(),
            countSupplierReferences: jest.fn(),
            bulkCreateSuppliers: jest.fn(),
            findWarehouses: jest.fn(),
            findWarehouseById: jest.fn(),
            createWarehouse: jest.fn(),
            updateWarehouse: jest.fn(),
            deleteWarehouse: jest.fn(),
            countWarehouseReferences: jest.fn(),
            findBinById: jest.fn(),
            findBins: jest.fn(),
            createBin: jest.fn(),
            updateBin: jest.fn(),
            findCustomersByCodes: jest.fn(),
            findItemsBySkus: jest.fn(),
            findWarehousesByNames: jest.fn(),
            findBinsByCodes: jest.fn(),
            findSuppliersByCodes: jest.fn(),
            findSupplierContacts: jest.fn(),
            findSupplierContactById: jest.fn(),
            createSupplierContact: jest.fn(),
            updateSupplierContact: jest.fn(),
            deleteSupplierContact: jest.fn(),
            findSupplierNotes: jest.fn(),
            createSupplierNote: jest.fn(),
            deleteSupplierNote: jest.fn(),
            findSupplierNcrs: jest.fn(),
            findSupplierNcrById: jest.fn(),
            createSupplierNcr: jest.fn(),
            updateSupplierNcr: jest.fn(),
            generateNcrNo: jest.fn(),
            generateContractNo: jest.fn(),
            findSupplierItems: jest.fn(),
            findSupplierItemById: jest.fn(),
            createSupplierItem: jest.fn(),
            updateSupplierItem: jest.fn(),
            deleteSupplierItem: jest.fn(),
            findSupplierContracts: jest.fn(),
            findSupplierContractById: jest.fn(),
            createSupplierContract: jest.fn(),
            updateSupplierContract: jest.fn(),
            findCustomerContacts: jest.fn(),
            findCustomerContactById: jest.fn(),
            createCustomerContact: jest.fn(),
            updateCustomerContact: jest.fn(),
            deleteCustomerContact: jest.fn(),
            findCustomerNotes: jest.fn(),
            createCustomerNote: jest.fn(),
            deleteCustomerNote: jest.fn(),
            findPurchaseOrders: jest.fn(),
            countPurchaseOrders: jest.fn(),
            findPurchaseOrderById: jest.fn(),
            createPurchaseOrder: jest.fn(),
            updatePurchaseOrder: jest.fn(),
            deletePurchaseOrder: jest.fn(),
            generatePoNo: jest.fn(),
            findPurchaseOrderLines: jest.fn(),
            createPurchaseOrderLine: jest.fn(),
            updatePurchaseOrderLine: jest.fn(),
            deletePurchaseOrderLine: jest.fn(),
            getPurchaseOrderStats: jest.fn(),
            getDashboardStats: jest.fn(),
            getRecentActivity: jest.fn(),
            getWeeklyTrend: jest.fn(),
            getStatusDistribution: jest.fn(),
            getOrdersByWarehouse: jest.fn(),
            getTopCustomers: jest.fn(),
            globalSearch: jest.fn(),
            getSalesReport: jest.fn(),
            getInventoryReport: jest.fn(),
            getProcurementReport: jest.fn(),
            getSupplierDashboardSummary: jest.fn(),
            getSupplierPerformanceStats: jest.fn(),
            getNcrTrendsByMonth: jest.fn(),
            getPurchaseOrderTrendsByMonth: jest.fn(),
            getCustomerDashboardSummary: jest.fn(),
            getCustomerPerformanceStats: jest.fn(),
            getSalesOrderTrendsByMonth: jest.fn(),
            listNotifications: jest.fn(),
            getUnreadNotificationCount: jest.fn(),
            createNotification: jest.fn(),
            markNotificationAsRead: jest.fn(),
            markAllNotificationsAsRead: jest.fn(),
            deleteNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MasterDataService>(MasterDataService);
    repository = module.get(MasterDataRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- Items ---

  describe("getItem", () => {
    it("should return item when found", async () => {
      repository.findItemById.mockResolvedValue(mockItem);

      const result = await service.getItem(tenantId, "item-123");

      expect(result).toEqual(mockItem);
      expect(repository.findItemById).toHaveBeenCalledWith(tenantId, "item-123");
    });

    it("should throw NotFoundException when item not found", async () => {
      repository.findItemById.mockResolvedValue(null);

      await expect(service.getItem(tenantId, "missing")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getItem(tenantId, "missing")).rejects.toThrow(
        "Item not found",
      );
    });
  });

  describe("createItem", () => {
    const createData = {
      tenantId,
      sku: "SKU-NEW",
      description: "New Item",
      uom: "KG",
    };

    it("should create item when SKU does not exist", async () => {
      repository.findItemBySku.mockResolvedValue(null);
      repository.createItem.mockResolvedValue({ ...mockItem, sku: "SKU-NEW" });

      const result = await service.createItem(createData);

      expect(result.sku).toBe("SKU-NEW");
      expect(repository.findItemBySku).toHaveBeenCalledWith(tenantId, "SKU-NEW");
      expect(repository.createItem).toHaveBeenCalledWith(createData);
    });

    it("should throw ConflictException when SKU already exists", async () => {
      repository.findItemBySku.mockResolvedValue(mockItem);

      await expect(service.createItem(createData)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createItem(createData)).rejects.toThrow(
        "SKU already exists",
      );
      expect(repository.createItem).not.toHaveBeenCalled();
    });
  });

  describe("updateItem", () => {
    it("should update item when found", async () => {
      const updated = { ...mockItem, description: "Updated" };
      repository.updateItem.mockResolvedValue(updated);

      const result = await service.updateItem(tenantId, "item-123", {
        description: "Updated",
      });

      expect(result.description).toBe("Updated");
      expect(repository.updateItem).toHaveBeenCalledWith(
        tenantId,
        "item-123",
        { description: "Updated" },
      );
    });

    it("should throw NotFoundException when item not found", async () => {
      repository.updateItem.mockResolvedValue(null);

      await expect(
        service.updateItem(tenantId, "missing", { description: "x" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteItem", () => {
    it("should delete item with no references", async () => {
      repository.findItemById.mockResolvedValue(mockItem);
      repository.countItemReferences.mockResolvedValue(0);
      repository.deleteItem.mockResolvedValue(true as any);

      await service.deleteItem(tenantId, "item-123");

      expect(repository.deleteItem).toHaveBeenCalledWith(tenantId, "item-123");
    });

    it("should throw NotFoundException when item not found", async () => {
      repository.findItemById.mockResolvedValue(null);

      await expect(service.deleteItem(tenantId, "missing")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when item has references", async () => {
      repository.findItemById.mockResolvedValue(mockItem);
      repository.countItemReferences.mockResolvedValue(3);

      await expect(service.deleteItem(tenantId, "item-123")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteItem(tenantId, "item-123")).rejects.toThrow(
        "Cannot delete item: referenced by existing orders",
      );
      expect(repository.deleteItem).not.toHaveBeenCalled();
    });
  });

  // --- Customers ---

  describe("getCustomer", () => {
    it("should return customer when found", async () => {
      repository.findCustomerById.mockResolvedValue(mockCustomer);

      const result = await service.getCustomer(tenantId, "customer-123");

      expect(result).toEqual(mockCustomer);
      expect(repository.findCustomerById).toHaveBeenCalledWith(
        tenantId,
        "customer-123",
      );
    });

    it("should throw NotFoundException when customer not found", async () => {
      repository.findCustomerById.mockResolvedValue(null);

      await expect(
        service.getCustomer(tenantId, "missing"),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getCustomer(tenantId, "missing"),
      ).rejects.toThrow("Customer not found");
    });
  });

  describe("deleteCustomer", () => {
    it("should delete customer with no references", async () => {
      repository.findCustomerById.mockResolvedValue(mockCustomer);
      repository.countCustomerReferences.mockResolvedValue(0);
      repository.deleteCustomer.mockResolvedValue(true as any);

      await service.deleteCustomer(tenantId, "customer-123");

      expect(repository.deleteCustomer).toHaveBeenCalledWith(
        tenantId,
        "customer-123",
      );
    });

    it("should throw BadRequestException when customer has sales orders", async () => {
      repository.findCustomerById.mockResolvedValue(mockCustomer);
      repository.countCustomerReferences.mockResolvedValue(5);

      await expect(
        service.deleteCustomer(tenantId, "customer-123"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deleteCustomer(tenantId, "customer-123"),
      ).rejects.toThrow("Cannot delete customer: has existing sales orders");
    });
  });

  // --- Suppliers ---

  describe("getSupplier", () => {
    it("should return supplier when found", async () => {
      repository.findSupplierById.mockResolvedValue(mockSupplier);

      const result = await service.getSupplier(tenantId, "supplier-123");

      expect(result).toEqual(mockSupplier);
      expect(repository.findSupplierById).toHaveBeenCalledWith(
        tenantId,
        "supplier-123",
      );
    });

    it("should throw NotFoundException when supplier not found", async () => {
      repository.findSupplierById.mockResolvedValue(null);

      await expect(
        service.getSupplier(tenantId, "missing"),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getSupplier(tenantId, "missing"),
      ).rejects.toThrow("Supplier not found");
    });
  });

  describe("deleteSupplier", () => {
    it("should delete supplier with no references", async () => {
      repository.findSupplierById.mockResolvedValue(mockSupplier);
      repository.countSupplierReferences.mockResolvedValue(0);
      repository.deleteSupplier.mockResolvedValue(true as any);

      await service.deleteSupplier(tenantId, "supplier-123");

      expect(repository.deleteSupplier).toHaveBeenCalledWith(
        tenantId,
        "supplier-123",
      );
    });

    it("should throw BadRequestException when supplier has purchase orders", async () => {
      repository.findSupplierById.mockResolvedValue(mockSupplier);
      repository.countSupplierReferences.mockResolvedValue(2);

      await expect(
        service.deleteSupplier(tenantId, "supplier-123"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deleteSupplier(tenantId, "supplier-123"),
      ).rejects.toThrow(
        "Cannot delete supplier: has existing purchase orders",
      );
    });
  });

  // --- Warehouses ---

  describe("getWarehouse", () => {
    it("should return warehouse when found", async () => {
      repository.findWarehouseById.mockResolvedValue(mockWarehouse);

      const result = await service.getWarehouse(tenantId, "warehouse-123");

      expect(result).toEqual(mockWarehouse);
      expect(repository.findWarehouseById).toHaveBeenCalledWith(
        tenantId,
        "warehouse-123",
      );
    });

    it("should throw NotFoundException when warehouse not found", async () => {
      repository.findWarehouseById.mockResolvedValue(null);

      await expect(
        service.getWarehouse(tenantId, "missing"),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getWarehouse(tenantId, "missing"),
      ).rejects.toThrow("Warehouse not found");
    });
  });

  describe("deleteWarehouse", () => {
    it("should delete warehouse with no references", async () => {
      repository.findWarehouseById.mockResolvedValue(mockWarehouse);
      repository.countWarehouseReferences.mockResolvedValue(0);
      repository.deleteWarehouse.mockResolvedValue(true as any);

      await service.deleteWarehouse(tenantId, "warehouse-123");

      expect(repository.deleteWarehouse).toHaveBeenCalledWith(
        tenantId,
        "warehouse-123",
      );
    });

    it("should throw BadRequestException when warehouse has work orders", async () => {
      repository.findWarehouseById.mockResolvedValue(mockWarehouse);
      repository.countWarehouseReferences.mockResolvedValue(1);

      await expect(
        service.deleteWarehouse(tenantId, "warehouse-123"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deleteWarehouse(tenantId, "warehouse-123"),
      ).rejects.toThrow(
        "Cannot delete warehouse: has existing work orders",
      );
    });
  });

  // --- Tenant isolation ---

  describe("tenant isolation", () => {
    it("should pass tenantId to repository for item operations", async () => {
      repository.findItemById.mockResolvedValue(mockItem);
      await service.getItem(tenantId, "item-123");
      expect(repository.findItemById).toHaveBeenCalledWith(tenantId, "item-123");
    });

    it("should pass tenantId to repository for customer operations", async () => {
      repository.findCustomerById.mockResolvedValue(mockCustomer);
      await service.getCustomer(tenantId, "customer-123");
      expect(repository.findCustomerById).toHaveBeenCalledWith(
        tenantId,
        "customer-123",
      );
    });

    it("should pass tenantId to repository for supplier operations", async () => {
      repository.findSupplierById.mockResolvedValue(mockSupplier);
      await service.getSupplier(tenantId, "supplier-123");
      expect(repository.findSupplierById).toHaveBeenCalledWith(
        tenantId,
        "supplier-123",
      );
    });
  });

  // --- Import ---

  describe("importItems", () => {
    it("should return import result with counts", async () => {
      repository.bulkCreateItems.mockResolvedValue({
        created: [mockItem],
        skippedCodes: ["SKU-DUP"],
      });

      const result = await service.importItems(tenantId, [
        { sku: "SKU-001", description: "Item 1" },
        { sku: "SKU-DUP", description: "Duplicate" },
      ]);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.skippedCodes).toEqual(["SKU-DUP"]);
    });
  });

  // --- List operations ---

  describe("listItems", () => {
    it("should return paginated items", async () => {
      repository.findItems.mockResolvedValue([mockItem]);
      repository.countItems.mockResolvedValue(1);

      const result = await service.listItems(tenantId, { page: 1, limit: 10 });

      expect(result.data).toEqual([mockItem]);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });
  });

  describe("listWarehouses", () => {
    it("should return warehouses for tenant", async () => {
      repository.findWarehouses.mockResolvedValue([mockWarehouse]);

      const result = await service.listWarehouses(tenantId);

      expect(result).toEqual([mockWarehouse]);
      expect(repository.findWarehouses).toHaveBeenCalledWith(
        tenantId,
        undefined,
      );
    });

    it("should filter by siteId", async () => {
      repository.findWarehouses.mockResolvedValue([mockWarehouse]);

      await service.listWarehouses(tenantId, "site-123");

      expect(repository.findWarehouses).toHaveBeenCalledWith(
        tenantId,
        "site-123",
      );
    });
  });

  // --- Purchase Orders ---

  describe("deletePurchaseOrder", () => {
    it("should delete a DRAFT purchase order", async () => {
      const draftPo = { id: "po-1", status: "DRAFT" };
      repository.findPurchaseOrderById.mockResolvedValue(draftPo as any);
      repository.deletePurchaseOrder.mockResolvedValue(true as any);

      await service.deletePurchaseOrder("po-1");

      expect(repository.deletePurchaseOrder).toHaveBeenCalledWith("po-1");
    });

    it("should throw BadRequestException for non-DRAFT purchase order", async () => {
      const confirmedPo = { id: "po-1", status: "CONFIRMED" };
      repository.findPurchaseOrderById.mockResolvedValue(confirmedPo as any);

      await expect(service.deletePurchaseOrder("po-1")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deletePurchaseOrder("po-1")).rejects.toThrow(
        "Only DRAFT purchase orders can be deleted",
      );
    });

    it("should throw NotFoundException when purchase order not found", async () => {
      repository.findPurchaseOrderById.mockResolvedValue(null);

      await expect(service.deletePurchaseOrder("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("reopenPurchaseOrder", () => {
    it("should reopen cancelled PO to DRAFT status", async () => {
      const cancelledPo = { id: "po-1", status: "CANCELLED" };
      const draftPo = { id: "po-1", status: "DRAFT" };
      repository.findPurchaseOrderById.mockResolvedValue(cancelledPo as any);
      repository.updatePurchaseOrder.mockResolvedValue(draftPo as any);

      const result = await service.reopenPurchaseOrder("po-1");

      expect(result.status).toBe("DRAFT");
      expect(repository.updatePurchaseOrder).toHaveBeenCalledWith("po-1", {
        status: "DRAFT",
      });
    });

    it("should reopen received PO to CONFIRMED status", async () => {
      const receivedPo = { id: "po-1", status: "RECEIVED" };
      const confirmedPo = { id: "po-1", status: "CONFIRMED" };
      repository.findPurchaseOrderById.mockResolvedValue(receivedPo as any);
      repository.updatePurchaseOrder.mockResolvedValue(confirmedPo as any);

      const result = await service.reopenPurchaseOrder("po-1");

      expect(result.status).toBe("CONFIRMED");
    });

    it("should throw BadRequestException for PO in invalid status", async () => {
      const draftPo = { id: "po-1", status: "DRAFT" };
      repository.findPurchaseOrderById.mockResolvedValue(draftPo as any);

      await expect(service.reopenPurchaseOrder("po-1")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reopenPurchaseOrder("po-1")).rejects.toThrow(
        "Only cancelled or received purchase orders can be reopened",
      );
    });
  });
});
