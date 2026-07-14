import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { ImportShipmentsService } from "./import-shipments.service";
import { ImportShipmentsRepository } from "./import-shipments.repository";

describe("ImportShipmentsService", () => {
  let service: ImportShipmentsService;
  let repository: jest.Mocked<ImportShipmentsRepository>;

  const tenantId = "tenant-123";
  const shipmentId = "shipment-1";
  const lineId = "line-1";

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
    lines: [],
  };

  const mockLine = {
    id: lineId,
    importShipmentId: shipmentId,
    lineNo: 1,
    productDescription: "Widget",
    itemId: null,
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
    createdAt: new Date(),
    updatedAt: new Date(),
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
          },
        },
      ],
    }).compile();

    service = module.get<ImportShipmentsService>(ImportShipmentsService);
    repository = module.get(ImportShipmentsRepository);
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
});
