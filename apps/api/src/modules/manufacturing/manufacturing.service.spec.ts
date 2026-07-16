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
import { WorkOrderRepository } from "./repositories/work-order.repository";
import { ProductionLedgerRepository } from "./repositories/production-ledger.repository";
import { ProductionDataRepository } from "./repositories/production-data.repository";
import { MrpRepository } from "./repositories/mrp.repository";
import { StockLedgerService } from "../inventory/stock-ledger.service";
import { MasterDataService } from "../masterdata/masterdata.service";

describe("ManufacturingService - Non-Conformances", () => {
  let service: ManufacturingService;
  let ncRepo: jest.Mocked<NonConformanceRepository>;

  const tenantId = "tenant-123";
  const ncId = "nc-123";
  const userId = "user-123";

  const baseNc: NonConformance = {
    id: ncId,
    tenantId,
    ncNo: "NC-000001",
    workOrderId: null,
    itemId: null,
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
        { provide: MasterDataService, useValue: {} },
      ],
    }).compile();

    service = module.get<ManufacturingService>(ManufacturingService);
    ncRepo = module.get(NonConformanceRepository);
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
});
