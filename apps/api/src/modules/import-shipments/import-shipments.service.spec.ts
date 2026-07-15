import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { ImportShipmentsService } from "./import-shipments.service";
import { ImportShipmentsRepository } from "./import-shipments.repository";
import { InventoryService } from "../inventory/inventory.service";

describe("ImportShipmentsService", () => {
  let service: ImportShipmentsService;
  let repository: jest.Mocked<ImportShipmentsRepository>;
  let inventoryService: jest.Mocked<InventoryService>;

  const tenantId = "tenant-123";
  const shipmentId = "shipment-1";
  const lineId = "line-1";
  const user = { id: "user-1", displayName: "Jane Doe" } as any;

  const mockLine = {
    id: lineId,
    importShipmentId: shipmentId,
    lineNo: 1,
    productDescription: "Widget",
    itemId: null as string | null,
    quantity: 10,
    cbm: null,
    palletQty: null,
    transportMode: "SEA",
    carrier: null,
    vesselOrAwb: null,
    destinationPort: null,
    status: "IN_TRANSIT_SEAWAY",
    weekStartDate: null,
    weekEndDate: null,
    notes: null,
    inspectedBy: null,
    inspectionReason: null,
    inspectionNotes: null,
    inspectedAt: null,
    receivedBy: null,
    receivedQty: null,
    receivingBinLocation: null,
    discrepancyNotes: null,
    receivedAt: null,
    grnId: null as string | null,
    ncrId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDetail = {
    id: shipmentId,
    tenantId,
    siteId: null,
    reference: "APO001",
    supplierId: "supplier-1",
    supplierName: "Supplier Co",
    incoterm: null,
    notes: null,
    purchaseOrderId: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lines: [mockLine],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportShipmentsService,
        {
          provide: ImportShipmentsRepository,
          useValue: {
            findDetailById: jest.fn(),
            updateLine: jest.fn(),
            completeInspection: jest.fn(),
            startReceiving: jest.fn(),
            completeReceiving: jest.fn(),
            createNcrForFailedInspection: jest.fn(),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            createGrn: jest.fn(),
            receiveGrnLine: jest.fn(),
            completeGrn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ImportShipmentsService>(ImportShipmentsService);
    repository = module.get(ImportShipmentsRepository);
    inventoryService = module.get(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("updateLine", () => {
    it("updates a line's fields when the shipment exists", async () => {
      repository.findDetailById.mockResolvedValue(mockDetail as any);
      repository.updateLine.mockResolvedValue({ ...mockLine, carrier: "MSC" } as any);

      const result = await service.updateLine(shipmentId, lineId, tenantId, { carrier: "MSC" });

      expect(result.carrier).toBe("MSC");
      expect(repository.updateLine).toHaveBeenCalledWith(shipmentId, lineId, tenantId, {
        carrier: "MSC",
      });
    });

    it("throws BadRequestException for an invalid status", async () => {
      await expect(
        service.updateLine(shipmentId, lineId, tenantId, { status: "NOT_A_REAL_STATUS" }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.updateLine).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when the shipment does not exist", async () => {
      repository.findDetailById.mockResolvedValue(null);

      await expect(
        service.updateLine(shipmentId, lineId, tenantId, { carrier: "MSC" }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.updateLine).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when the line does not exist", async () => {
      repository.findDetailById.mockResolvedValue(mockDetail as any);
      repository.updateLine.mockResolvedValue(null);

      await expect(
        service.updateLine(shipmentId, lineId, tenantId, { carrier: "MSC" }),
      ).rejects.toThrow("Shipment line not found");
    });
  });

  describe("completeInspection", () => {
    it("passes inspection without creating an NCR", async () => {
      repository.findDetailById.mockResolvedValue(mockDetail as any);
      repository.completeInspection.mockResolvedValue({
        ...mockLine,
        status: "INSPECTION_PASSED",
      } as any);

      const result = await service.completeInspection(
        shipmentId,
        lineId,
        tenantId,
        { passed: true, notes: "Looks good" },
        user,
      );

      expect(result.status).toBe("INSPECTION_PASSED");
      expect(repository.createNcrForFailedInspection).not.toHaveBeenCalled();
      expect(repository.completeInspection).toHaveBeenCalledWith(shipmentId, lineId, tenantId, {
        status: "INSPECTION_PASSED",
        reason: undefined,
        notes: "Looks good",
        inspectedBy: "Jane Doe",
        ncrId: undefined,
      });
    });

    it("throws BadRequestException when failed without a reason", async () => {
      repository.findDetailById.mockResolvedValue(mockDetail as any);

      await expect(
        service.completeInspection(shipmentId, lineId, tenantId, { passed: false }, user),
      ).rejects.toThrow(BadRequestException);
      expect(repository.createNcrForFailedInspection).not.toHaveBeenCalled();
    });

    it("creates an NCR and links it when inspection fails with a reason", async () => {
      repository.findDetailById.mockResolvedValue(mockDetail as any);
      repository.createNcrForFailedInspection.mockResolvedValue("ncr-1");
      repository.completeInspection.mockResolvedValue({
        ...mockLine,
        status: "INSPECTION_FAILED",
        ncrId: "ncr-1",
      } as any);

      const result = await service.completeInspection(
        shipmentId,
        lineId,
        tenantId,
        { passed: false, reason: "DAMAGED_STOCK", notes: "Box crushed" },
        user,
      );

      expect(result.ncrId).toBe("ncr-1");
      expect(repository.createNcrForFailedInspection).toHaveBeenCalledWith(
        tenantId,
        "supplier-1",
        expect.stringContaining("Damaged Stock"),
        "user-1",
      );
      expect(repository.completeInspection).toHaveBeenCalledWith(shipmentId, lineId, tenantId, {
        status: "INSPECTION_FAILED",
        reason: "DAMAGED_STOCK",
        notes: "Box crushed",
        inspectedBy: "Jane Doe",
        ncrId: "ncr-1",
      });
    });
  });

  describe("startReceiving", () => {
    it("creates a GRN when the line has a linked item", async () => {
      const detailWithItem = { ...mockDetail, lines: [{ ...mockLine, itemId: "item-1" }] };
      repository.findDetailById.mockResolvedValue(detailWithItem as any);
      inventoryService.createGrn.mockResolvedValue({ id: "grn-1" } as any);
      repository.startReceiving.mockResolvedValue({
        ...mockLine,
        itemId: "item-1",
        status: "RECEIVING",
        grnId: "grn-1",
      } as any);

      const result = await service.startReceiving(shipmentId, lineId, tenantId, {
        warehouseId: "warehouse-1",
      });

      expect(inventoryService.createGrn).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId, warehouseId: "warehouse-1", supplierId: "supplier-1" }),
      );
      expect(repository.startReceiving).toHaveBeenCalledWith(shipmentId, lineId, tenantId, {
        grnId: "grn-1",
      });
      expect(result.grnId).toBe("grn-1");
    });

    it("throws BadRequestException when a linked item has no warehouse", async () => {
      const detailWithItem = { ...mockDetail, lines: [{ ...mockLine, itemId: "item-1" }] };
      repository.findDetailById.mockResolvedValue(detailWithItem as any);

      await expect(
        service.startReceiving(shipmentId, lineId, tenantId, {}),
      ).rejects.toThrow(BadRequestException);
      expect(inventoryService.createGrn).not.toHaveBeenCalled();
    });

    it("skips GRN creation when the line has no linked item", async () => {
      repository.findDetailById.mockResolvedValue(mockDetail as any);
      repository.startReceiving.mockResolvedValue({ ...mockLine, status: "RECEIVING" } as any);

      await service.startReceiving(shipmentId, lineId, tenantId, {});

      expect(inventoryService.createGrn).not.toHaveBeenCalled();
      expect(repository.startReceiving).toHaveBeenCalledWith(shipmentId, lineId, tenantId, {
        grnId: undefined,
      });
    });
  });

  describe("completeReceiving", () => {
    it("scans and completes the GRN when the line is linked to one", async () => {
      const linkedLine = { ...mockLine, itemId: "item-1", grnId: "grn-1" };
      repository.findDetailById.mockResolvedValue({ ...mockDetail, lines: [linkedLine] } as any);
      repository.completeReceiving.mockResolvedValue({ ...linkedLine, status: "STORED" } as any);

      await service.completeReceiving(
        shipmentId,
        lineId,
        tenantId,
        { receivedQty: 5, binId: "bin-1" },
        user,
      );

      expect(inventoryService.receiveGrnLine).toHaveBeenCalledWith(
        "grn-1",
        expect.objectContaining({ tenantId, itemId: "item-1", qtyReceived: 5, receivingBinId: "bin-1" }),
      );
      expect(inventoryService.completeGrn).toHaveBeenCalledWith("grn-1");
      expect(repository.completeReceiving).toHaveBeenCalledWith(shipmentId, lineId, tenantId, {
        receivedQty: 5,
        receivingBinLocation: undefined,
        discrepancyNotes: undefined,
        receivedBy: "Jane Doe",
      });
    });

    it("throws BadRequestException when GRN path is missing qty or bin", async () => {
      const linkedLine = { ...mockLine, itemId: "item-1", grnId: "grn-1" };
      repository.findDetailById.mockResolvedValue({ ...mockDetail, lines: [linkedLine] } as any);

      await expect(
        service.completeReceiving(shipmentId, lineId, tenantId, {}, user),
      ).rejects.toThrow(BadRequestException);
      expect(inventoryService.receiveGrnLine).not.toHaveBeenCalled();
    });

    it("uses flat fields with no GRN when the line has no linked item", async () => {
      repository.findDetailById.mockResolvedValue(mockDetail as any);
      repository.completeReceiving.mockResolvedValue({ ...mockLine, status: "STORED" } as any);

      await service.completeReceiving(
        shipmentId,
        lineId,
        tenantId,
        { receivedQty: 3, binLocation: "Rack A3", discrepancyNotes: "1 short" },
        user,
      );

      expect(inventoryService.receiveGrnLine).not.toHaveBeenCalled();
      expect(inventoryService.completeGrn).not.toHaveBeenCalled();
      expect(repository.completeReceiving).toHaveBeenCalledWith(shipmentId, lineId, tenantId, {
        receivedQty: 3,
        receivingBinLocation: "Rack A3",
        discrepancyNotes: "1 short",
        receivedBy: "Jane Doe",
      });
    });
  });
});
