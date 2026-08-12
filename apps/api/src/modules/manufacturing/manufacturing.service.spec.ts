import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ManufacturingService } from "./manufacturing.service";
import {
  NonConformanceRepository,
  NonConformance,
} from "./repositories/non-conformance.repository";
import { WorkstationRepository } from "./repositories/workstation.repository";
import { BomRepository } from "./repositories/bom.repository";
import { RoutingRepository } from "./repositories/routing.repository";
import { WorkOrderRepository, WorkOrder } from "./repositories/work-order.repository";
import { ProductionLedgerRepository } from "./repositories/production-ledger.repository";
import { ProductionDataRepository } from "./repositories/production-data.repository";
import { MrpRepository } from "./repositories/mrp.repository";
import { StockLedgerService } from "../inventory/stock-ledger.service";
import {
  BatchQualityRepository,
  BatchQuality,
} from "../inventory/batch-quality.repository";
import { MasterDataService } from "../masterdata/masterdata.service";

describe("ManufacturingService - Non-Conformances", () => {
  let service: ManufacturingService;
  let ncRepo: jest.Mocked<NonConformanceRepository>;
  let batchQualityRepo: jest.Mocked<BatchQualityRepository>;

  const tenantId = "tenant-123";
  const ncId = "nc-123";
  const userId = "user-123";

  const baseNc: NonConformance = {
    id: ncId,
    tenantId,
    ncNo: "NC-000001",
    workOrderId: null,
    itemId: null,
    batchNo: null,
    reportedBy: "user-reporter",
    defectType: "VISUAL",
    severity: "MINOR",
    description: "Test defect",
    qtyAffected: 1,
    disposition: null,
    correctiveAction: null,
    rootCause: null,
    status: "OPEN",
    resolvedBy: null,
    resolvedAt: null,
    assigneeId: null,
    dueDate: null,
    closedBy: null,
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManufacturingService,
        {
          provide: NonConformanceRepository,
          useValue: {
            generateNcNo: jest.fn(),
            findByTenant: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        { provide: WorkstationRepository, useValue: {} },
        { provide: BomRepository, useValue: {} },
        { provide: RoutingRepository, useValue: {} },
        { provide: WorkOrderRepository, useValue: {} },
        { provide: ProductionLedgerRepository, useValue: {} },
        { provide: ProductionDataRepository, useValue: {} },
        { provide: MrpRepository, useValue: {} },
        { provide: StockLedgerService, useValue: {} },
        {
          provide: BatchQualityRepository,
          useValue: {
            isAllowedTransition: jest.fn(),
            ensureStatusRecord: jest.fn(),
            findStatus: jest.fn(),
            findStatusesForWorkOrderOutput: jest.fn(),
            setStatus: jest.fn(),
            listBatches: jest.fn(),
          },
        },
        { provide: MasterDataService, useValue: {} },
      ],
    }).compile();

    service = module.get<ManufacturingService>(ManufacturingService);
    ncRepo = module.get(NonConformanceRepository);
    batchQualityRepo = module.get(BatchQualityRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getNonConformance / updateNonConformance tenant scoping", () => {
    it("passes tenantId through to findById", async () => {
      ncRepo.findById.mockResolvedValue(baseNc as never);
      await service.getNonConformance(tenantId, ncId);
      expect(ncRepo.findById).toHaveBeenCalledWith(tenantId, ncId);
    });

    it("throws NotFoundException when not found for tenant", async () => {
      ncRepo.findById.mockResolvedValue(null);
      await expect(service.getNonConformance(tenantId, ncId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("updateNonConformance scopes the lookup by tenant before updating", async () => {
      ncRepo.findById.mockResolvedValue(baseNc as never);
      ncRepo.update.mockResolvedValue(baseNc);
      await service.updateNonConformance(tenantId, ncId, { rootCause: "x" });
      expect(ncRepo.findById).toHaveBeenCalledWith(tenantId, ncId);
      expect(ncRepo.update).toHaveBeenCalledWith(ncId, { rootCause: "x" });
    });
  });

  describe("startReviewNonConformance", () => {
    it("moves OPEN to UNDER_REVIEW", async () => {
      ncRepo.findById.mockResolvedValue(baseNc as never);
      ncRepo.update.mockResolvedValue({ ...baseNc, status: "UNDER_REVIEW" });
      await service.startReviewNonConformance(tenantId, ncId);
      expect(ncRepo.update).toHaveBeenCalledWith(ncId, {
        status: "UNDER_REVIEW",
      });
    });

    it("rejects when not OPEN", async () => {
      ncRepo.findById.mockResolvedValue({
        ...baseNc,
        status: "UNDER_REVIEW",
      } as never);
      await expect(
        service.startReviewNonConformance(tenantId, ncId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("assignNonConformance", () => {
    it("assigns and advances OPEN to UNDER_REVIEW", async () => {
      ncRepo.findById.mockResolvedValue(baseNc as never);
      ncRepo.update.mockResolvedValue(baseNc);
      await service.assignNonConformance(tenantId, ncId, userId);
      expect(ncRepo.update).toHaveBeenCalledWith(ncId, {
        assigneeId: userId,
        status: "UNDER_REVIEW",
      });
    });

    it("does not change status when already past OPEN", async () => {
      ncRepo.findById.mockResolvedValue({
        ...baseNc,
        status: "UNDER_REVIEW",
      } as never);
      ncRepo.update.mockResolvedValue(baseNc);
      await service.assignNonConformance(tenantId, ncId, userId);
      expect(ncRepo.update).toHaveBeenCalledWith(ncId, {
        assigneeId: userId,
        status: undefined,
      });
    });
  });

  describe("closeNonConformance", () => {
    it("rejects when not RESOLVED", async () => {
      ncRepo.findById.mockResolvedValue(baseNc as never);
      await expect(
        service.closeNonConformance(tenantId, ncId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it("sets closedBy/closedAt when RESOLVED", async () => {
      ncRepo.findById.mockResolvedValue({
        ...baseNc,
        status: "RESOLVED",
      } as never);
      ncRepo.update.mockResolvedValue(baseNc);
      await service.closeNonConformance(tenantId, ncId, userId);
      expect(ncRepo.update).toHaveBeenCalledWith(
        ncId,
        expect.objectContaining({ status: "CLOSED", closedBy: userId }),
      );
    });
  });

  describe("reopenNonConformance", () => {
    it("rejects when not RESOLVED or CLOSED", async () => {
      ncRepo.findById.mockResolvedValue(baseNc as never);
      await expect(
        service.reopenNonConformance(tenantId, ncId),
      ).rejects.toThrow(BadRequestException);
    });

    it("clears closedBy/closedAt and reopens to UNDER_REVIEW", async () => {
      ncRepo.findById.mockResolvedValue({
        ...baseNc,
        status: "CLOSED",
        closedBy: userId,
        closedAt: new Date(),
      } as never);
      ncRepo.update.mockResolvedValue(baseNc);
      await service.reopenNonConformance(tenantId, ncId);
      expect(ncRepo.update).toHaveBeenCalledWith(ncId, {
        status: "UNDER_REVIEW",
        closedBy: null,
        closedAt: null,
      });
    });
  });

  describe("resolveNonConformance", () => {
    it("requires rootCause and sets RESOLVED", async () => {
      ncRepo.findById.mockResolvedValue(baseNc as never);
      ncRepo.update.mockResolvedValue(baseNc);
      await service.resolveNonConformance(tenantId, ncId, {
        disposition: "REWORK",
        correctiveAction: "Fix it",
        rootCause: "Bad calibration",
        resolvedBy: userId,
      });
      expect(ncRepo.update).toHaveBeenCalledWith(
        ncId,
        expect.objectContaining({
          disposition: "REWORK",
          correctiveAction: "Fix it",
          rootCause: "Bad calibration",
          status: "RESOLVED",
        }),
      );
    });

    it("rejects resolving a CLOSED non-conformance", async () => {
      ncRepo.findById.mockResolvedValue({
        ...baseNc,
        status: "CLOSED",
      } as never);
      await expect(
        service.resolveNonConformance(tenantId, ncId, {
          disposition: "REWORK",
          correctiveAction: "Fix it",
          rootCause: "Bad calibration",
          resolvedBy: userId,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("setBatchQualityStatus", () => {
    const itemId = "item-123";
    const batchNo = "BATCH-001";

    const makeBatchQuality = (
      qualityStatus: BatchQuality["qualityStatus"],
    ): BatchQuality => ({
      id: "bq-1",
      tenantId,
      itemId,
      batchNo,
      qualityStatus,
      source: "PRODUCTION",
      setBy: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it("throws if no quality record exists for the item/batch", async () => {
      batchQualityRepo.findStatus.mockResolvedValue(null);
      await expect(
        service.setBatchQualityStatus(
          tenantId,
          itemId,
          batchNo,
          "APPROVED",
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("rejects a disallowed transition (e.g. REJECTED -> APPROVED)", async () => {
      batchQualityRepo.findStatus.mockResolvedValue(
        makeBatchQuality("REJECTED"),
      );
      batchQualityRepo.isAllowedTransition.mockReturnValue(false);
      await expect(
        service.setBatchQualityStatus(
          tenantId,
          itemId,
          batchNo,
          "APPROVED",
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(batchQualityRepo.setStatus).not.toHaveBeenCalled();
    });

    it("allows AWAITING_QC -> ON_HOLD and persists it", async () => {
      batchQualityRepo.findStatus.mockResolvedValue(
        makeBatchQuality("AWAITING_QC"),
      );
      batchQualityRepo.isAllowedTransition.mockReturnValue(true);
      batchQualityRepo.setStatus.mockResolvedValue(
        makeBatchQuality("ON_HOLD"),
      );

      const result = await service.setBatchQualityStatus(
        tenantId,
        itemId,
        batchNo,
        "ON_HOLD",
        userId,
        "Failed visual inspection",
      );

      expect(batchQualityRepo.setStatus).toHaveBeenCalledWith(
        tenantId,
        itemId,
        batchNo,
        "ON_HOLD",
        userId,
        "Failed visual inspection",
      );
      expect(result.qualityStatus).toBe("ON_HOLD");
    });
  });

  describe("listBatchQuality", () => {
    it("passes tenant, filters, and pagination straight through to the repository", async () => {
      const expected = { data: [], total: 0 };
      batchQualityRepo.listBatches.mockResolvedValue(expected as any);

      const result = await service.listBatchQuality(
        tenantId,
        { status: "AWAITING_QC", search: "FP-" },
        2,
        50,
      );

      expect(batchQualityRepo.listBatches).toHaveBeenCalledWith(
        tenantId,
        { status: "AWAITING_QC", search: "FP-" },
        2,
        50,
      );
      expect(result).toBe(expected);
    });
  });
});

describe("ManufacturingService - Production Output", () => {
  let service: ManufacturingService;
  let workOrderRepo: jest.Mocked<WorkOrderRepository>;
  let productionLedgerRepo: jest.Mocked<ProductionLedgerRepository>;
  let productionDataRepo: jest.Mocked<ProductionDataRepository>;
  let stockLedgerService: jest.Mocked<StockLedgerService>;
  let batchQualityRepo: jest.Mocked<BatchQualityRepository>;
  let masterDataService: jest.Mocked<MasterDataService>;

  const tenantId = "tenant-123";
  const workOrderId = "wo-123";

  const baseWorkOrder: WorkOrder = {
    id: workOrderId,
    tenantId,
    siteId: "site-123",
    warehouseId: "warehouse-123",
    workOrderNo: "WO-000001",
    itemId: "item-123",
    bomHeaderId: null,
    routingId: null,
    status: "IN_PROGRESS",
    priority: 5,
    qtyOrdered: 100,
    qtyCompleted: 0,
    qtyScrapped: 0,
    plannedStart: null,
    plannedEnd: null,
    actualStart: null,
    actualEnd: null,
    salesOrderId: null,
    batchNo: null,
    notes: null,
    createdBy: "user-123",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseItem = {
    id: "item-123",
    tenantId,
    sku: "FG-001",
    description: "Finished Good",
    uom: "EA",
    weightKg: null,
    hsCode: null,
    countryOfOrigin: null,
    isActive: true,
    requiresBatchTracking: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseMaterial = {
    id: "material-123",
    tenantId,
    workOrderId,
    bomLineId: null,
    itemId: "raw-item-123",
    qtyRequired: 10,
    qtyIssued: 0,
    qtyReturned: 0,
    status: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManufacturingService,
        { provide: NonConformanceRepository, useValue: {} },
        { provide: WorkstationRepository, useValue: {} },
        { provide: BomRepository, useValue: {} },
        { provide: RoutingRepository, useValue: {} },
        {
          provide: WorkOrderRepository,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
            getOperations: jest.fn(),
            getMaterials: jest.fn(),
            findMaterialById: jest.fn(),
            updateMaterial: jest.fn(),
            generateBatchNoWithPrefix: jest.fn(),
          },
        },
        {
          provide: ProductionLedgerRepository,
          useValue: { create: jest.fn(), getNextRunNo: jest.fn() },
        },
        {
          provide: ProductionDataRepository,
          useValue: {
            findChecksByWorkOrder: jest.fn(),
            findProcessByWorkOrder: jest.fn(),
          },
        },
        { provide: MrpRepository, useValue: {} },
        {
          provide: StockLedgerService,
          useValue: { recordMovement: jest.fn(), getStockInBin: jest.fn() },
        },
        {
          provide: BatchQualityRepository,
          useValue: { ensureStatusRecord: jest.fn() },
        },
        { provide: MasterDataService, useValue: { getItem: jest.fn() } },
      ],
    }).compile();

    service = module.get<ManufacturingService>(ManufacturingService);
    workOrderRepo = module.get(WorkOrderRepository);
    productionLedgerRepo = module.get(ProductionLedgerRepository);
    productionDataRepo = module.get(ProductionDataRepository);
    stockLedgerService = module.get(StockLedgerService);
    batchQualityRepo = module.get(BatchQualityRepository);
    masterDataService = module.get(MasterDataService);

    workOrderRepo.findById.mockResolvedValue(baseWorkOrder);
    workOrderRepo.update.mockResolvedValue({ ...baseWorkOrder, qtyCompleted: 10 });
    workOrderRepo.getOperations.mockResolvedValue([]);
    workOrderRepo.getMaterials.mockResolvedValue([]);
    productionDataRepo.findChecksByWorkOrder.mockResolvedValue(null);
    productionDataRepo.findProcessByWorkOrder.mockResolvedValue(null);
    masterDataService.getItem.mockResolvedValue(baseItem);
    productionLedgerRepo.getNextRunNo.mockResolvedValue(1);
    stockLedgerService.getStockInBin.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("recordOutput", () => {
    it("should throw BadRequestException when the item requires a batch and none is given", async () => {
      masterDataService.getItem.mockResolvedValue({
        ...baseItem,
        requiresBatchTracking: true,
      });

      await expect(
        service.recordOutput(workOrderId, {
          qty: 10,
          binId: "bin-123",
          createdBy: "user-123",
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.recordOutput(workOrderId, {
          qty: 10,
          binId: "bin-123",
          createdBy: "user-123",
        }),
      ).rejects.toThrow("FG-001 requires a batch/lot number to record output");

      expect(stockLedgerService.recordMovement).not.toHaveBeenCalled();
    });

    it("should record output when the item does not require a batch", async () => {
      await service.recordOutput(workOrderId, {
        qty: 10,
        binId: "bin-123",
        createdBy: "user-123",
      });

      expect(stockLedgerService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: "item-123", qty: 10, reason: "WO_PRODUCE" }),
      );
    });

    it("should record output when a batch-tracked item is given a batch number", async () => {
      masterDataService.getItem.mockResolvedValue({
        ...baseItem,
        requiresBatchTracking: true,
      });

      await service.recordOutput(workOrderId, {
        qty: 10,
        binId: "bin-123",
        batchNo: "BATCH-001",
        createdBy: "user-123",
      });

      expect(stockLedgerService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({ batchNo: "BATCH-001" }),
      );
      expect(batchQualityRepo.ensureStatusRecord).toHaveBeenCalledWith(
        expect.objectContaining({ batchNo: "BATCH-001", initialStatus: "AWAITING_QC" }),
      );
    });

    it("should default to the work order's own system-assigned batch when none is given per-output", async () => {
      masterDataService.getItem.mockResolvedValue({
        ...baseItem,
        requiresBatchTracking: true,
      });
      workOrderRepo.findById.mockResolvedValue({
        ...baseWorkOrder,
        batchNo: "BATCH-20260218-001",
      });

      await service.recordOutput(workOrderId, {
        qty: 10,
        binId: "bin-123",
        createdBy: "user-123",
      });

      expect(stockLedgerService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({ batchNo: "BATCH-20260218-001" }),
      );
      expect(batchQualityRepo.ensureStatusRecord).toHaveBeenCalledWith(
        expect.objectContaining({ batchNo: "BATCH-20260218-001", initialStatus: "AWAITING_QC" }),
      );
    });

    it("should mint a fresh batch number (same date prefix, next sequence) for the 2nd+ output run", async () => {
      workOrderRepo.findById.mockResolvedValue({
        ...baseWorkOrder,
        batchNo: "BATCH-20260218-001",
      });
      productionLedgerRepo.getNextRunNo.mockResolvedValue(3);
      workOrderRepo.generateBatchNoWithPrefix.mockResolvedValue("BATCH-20260218-003");

      const result = await service.recordOutput(workOrderId, {
        qty: 10,
        binId: "bin-123",
        createdBy: "user-123",
      });

      expect(workOrderRepo.generateBatchNoWithPrefix).toHaveBeenCalledWith(
        tenantId,
        "BATCH-20260218-",
      );
      expect(productionLedgerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ batchNo: "BATCH-20260218-003", runNo: 3 }),
      );
      expect(stockLedgerService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({ batchNo: "BATCH-20260218-003" }),
      );
      expect((result as any).lastOutputRunNo).toBe(3);
      expect((result as any).lastOutputBatchNo).toBe("BATCH-20260218-003");
    });
  });

  describe("issueMaterial", () => {
    beforeEach(() => {
      workOrderRepo.findById.mockResolvedValue({
        ...baseWorkOrder,
        status: "RELEASED",
      });
      workOrderRepo.findMaterialById.mockResolvedValue(baseMaterial);
      workOrderRepo.updateMaterial.mockResolvedValue({
        ...baseMaterial,
        qtyIssued: 5,
        status: "PARTIAL",
      });
    });

    it("throws BadRequestException when the material requires a batch and none is given", async () => {
      masterDataService.getItem.mockResolvedValue({
        ...baseItem,
        sku: "RAW-001",
        requiresBatchTracking: true,
      });

      await expect(
        service.issueMaterial(workOrderId, {
          materialId: "material-123",
          qty: 5,
          binId: "bin-123",
          createdBy: "user-123",
        }),
      ).rejects.toThrow(BadRequestException);
      expect(stockLedgerService.recordMovement).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when the requested qty exceeds what's available in that bin/batch", async () => {
      stockLedgerService.getStockInBin.mockResolvedValue([
        {
          itemId: "raw-item-123",
          binId: "bin-123",
          batchNo: "BATCH-001",
          expiryDate: null,
          qtyOnHand: 3,
          qtyReserved: 0,
          qtyAvailable: 3,
        } as any,
      ]);

      await expect(
        service.issueMaterial(workOrderId, {
          materialId: "material-123",
          qty: 5,
          binId: "bin-123",
          batchNo: "BATCH-001",
          createdBy: "user-123",
        }),
      ).rejects.toThrow(BadRequestException);
      expect(stockLedgerService.recordMovement).not.toHaveBeenCalled();
    });

    it("issues the material and records its batch when stock is available", async () => {
      masterDataService.getItem.mockResolvedValue({
        ...baseItem,
        sku: "RAW-001",
        requiresBatchTracking: true,
      });
      stockLedgerService.getStockInBin.mockResolvedValue([
        {
          itemId: "raw-item-123",
          binId: "bin-123",
          batchNo: "BATCH-001",
          expiryDate: null,
          qtyOnHand: 10,
          qtyReserved: 0,
          qtyAvailable: 10,
        } as any,
      ]);

      await service.issueMaterial(workOrderId, {
        materialId: "material-123",
        qty: 5,
        binId: "bin-123",
        batchNo: "BATCH-001",
        createdBy: "user-123",
      });

      expect(stockLedgerService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: "raw-item-123",
          fromBinId: "bin-123",
          qty: -5,
          batchNo: "BATCH-001",
        }),
      );
      expect(workOrderRepo.updateMaterial).toHaveBeenCalledWith(
        "material-123",
        { qtyIssued: 5, status: "PARTIAL" },
      );
    });
  });

  describe("returnMaterial", () => {
    beforeEach(() => {
      workOrderRepo.findMaterialById.mockResolvedValue({
        ...baseMaterial,
        qtyIssued: 5,
      });
      workOrderRepo.updateMaterial.mockResolvedValue({
        ...baseMaterial,
        qtyIssued: 5,
        qtyReturned: 2,
      });
    });

    it("throws BadRequestException when the material requires a batch and none is given", async () => {
      masterDataService.getItem.mockResolvedValue({
        ...baseItem,
        sku: "RAW-001",
        requiresBatchTracking: true,
      });

      await expect(
        service.returnMaterial(workOrderId, {
          materialId: "material-123",
          qty: 2,
          binId: "bin-123",
          createdBy: "user-123",
        }),
      ).rejects.toThrow(BadRequestException);
      expect(stockLedgerService.recordMovement).not.toHaveBeenCalled();
    });

    it("returns the material with its batch when one is given", async () => {
      masterDataService.getItem.mockResolvedValue({
        ...baseItem,
        sku: "RAW-001",
        requiresBatchTracking: true,
      });

      await service.returnMaterial(workOrderId, {
        materialId: "material-123",
        qty: 2,
        binId: "bin-123",
        batchNo: "BATCH-001",
        createdBy: "user-123",
      });

      expect(stockLedgerService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: "raw-item-123",
          toBinId: "bin-123",
          qty: 2,
          batchNo: "BATCH-001",
        }),
      );
      expect(workOrderRepo.updateMaterial).toHaveBeenCalledWith(
        "material-123",
        { qtyReturned: 2 },
      );
    });
  });

  describe("previewNextOutput", () => {
    it("previews the work order's own batch for run 1", async () => {
      workOrderRepo.findById.mockResolvedValue({
        ...baseWorkOrder,
        batchNo: "BATCH-20260218-001",
      });
      productionLedgerRepo.getNextRunNo.mockResolvedValue(1);

      const preview = await service.previewNextOutput(workOrderId);

      expect(preview).toEqual({ runNo: 1, batchNo: "BATCH-20260218-001" });
      expect(workOrderRepo.generateBatchNoWithPrefix).not.toHaveBeenCalled();
    });

    it("previews a freshly minted batch for run 2+", async () => {
      workOrderRepo.findById.mockResolvedValue({
        ...baseWorkOrder,
        batchNo: "BATCH-20260218-001",
      });
      productionLedgerRepo.getNextRunNo.mockResolvedValue(2);
      workOrderRepo.generateBatchNoWithPrefix.mockResolvedValue("BATCH-20260218-002");

      const preview = await service.previewNextOutput(workOrderId);

      expect(workOrderRepo.generateBatchNoWithPrefix).toHaveBeenCalledWith(
        tenantId,
        "BATCH-20260218-",
      );
      expect(preview).toEqual({ runNo: 2, batchNo: "BATCH-20260218-002" });
    });
  });

  describe("completeWorkOrder", () => {
    it("should throw BadRequestException when no output has been recorded", async () => {
      workOrderRepo.findById.mockResolvedValue({ ...baseWorkOrder, qtyCompleted: 0 });

      await expect(service.completeWorkOrder(workOrderId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.completeWorkOrder(workOrderId)).rejects.toThrow(
        "Cannot complete a work order with no recorded production output — record output first, or cancel the work order instead",
      );
      expect(workOrderRepo.update).not.toHaveBeenCalled();
    });

    it("should complete the work order when output has been recorded, even if partial", async () => {
      workOrderRepo.findById.mockResolvedValue({ ...baseWorkOrder, qtyCompleted: 60, qtyOrdered: 100 });

      await service.completeWorkOrder(workOrderId);

      expect(workOrderRepo.update).toHaveBeenCalledWith(
        workOrderId,
        expect.objectContaining({ status: "COMPLETED" }),
      );
    });
  });
});
