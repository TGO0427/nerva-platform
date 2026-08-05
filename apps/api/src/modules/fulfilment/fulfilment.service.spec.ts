import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { FulfilmentService } from "./fulfilment.service";
import {
  FulfilmentRepository,
  PickWave,
  PickTask,
} from "./fulfilment.repository";
import { StockLedgerService } from "../inventory/stock-ledger.service";
import { SalesService } from "../sales/sales.service";

describe("FulfilmentService - pick task/wave cancellation and reversal", () => {
  let service: FulfilmentService;
  let repository: jest.Mocked<FulfilmentRepository>;
  let stockLedger: jest.Mocked<StockLedgerService>;
  let salesService: jest.Mocked<SalesService>;

  const waveId = "wave-123";

  const baseWave: PickWave = {
    id: waveId,
    tenantId: "tenant-123",
    warehouseId: "warehouse-123",
    waveNo: "WAVE-000001",
    status: "OPEN",
    createdBy: "user-123",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseTask: PickTask = {
    id: "task-123",
    tenantId: "tenant-123",
    pickWaveId: waveId,
    salesOrderId: "so-123",
    salesOrderLineId: "sol-123",
    reservationId: "res-123",
    itemId: "item-123",
    itemSku: "FP-YOGURT-PEA",
    itemDescription: "Peach Yogurt 500ml",
    fromBinId: "bin-123",
    fromBinCode: "A-01-03",
    qtyToPick: 1,
    qtyPicked: 0,
    status: "OPEN",
    shortReason: null,
    assignedTo: null,
    pickedAt: null,
    batchNo: "BATCH-20260220-001",
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FulfilmentService,
        {
          provide: FulfilmentRepository,
          useValue: {
            findPickWaveById: jest.fn(),
            findPickTasksByWave: jest.fn(),
            findPickTaskById: jest.fn(),
            cancelPickTask: jest.fn(),
            reversePickTask: jest.fn(),
            updatePickWaveStatus: jest.fn(),
          },
        },
        {
          provide: StockLedgerService,
          useValue: {
            recordMovement: jest.fn(),
            reserveStockWithBatch: jest.fn(),
            releaseReservation: jest.fn(),
          },
        },
        {
          provide: SalesService,
          useValue: { markReservationUnpicked: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<FulfilmentService>(FulfilmentService);
    repository = module.get(FulfilmentRepository);
    stockLedger = module.get(StockLedgerService);
    salesService = module.get(SalesService);

    repository.findPickWaveById.mockResolvedValue(baseWave);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("cancelPickWave", () => {
    it("throws and names the item/batch when a task in the wave is already PICKED", async () => {
      repository.findPickTasksByWave.mockResolvedValue([
        { ...baseTask, status: "PICKED" },
      ]);

      await expect(service.cancelPickWave(waveId, "test")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancelPickWave(waveId, "test")).rejects.toThrow(
        "FP-YOGURT-PEA (BATCH-20260220-001)",
      );
      expect(repository.cancelPickTask).not.toHaveBeenCalled();
      expect(repository.updatePickWaveStatus).not.toHaveBeenCalled();
    });

    it("also blocks on a SHORT task, since a partial pick still moved real stock", async () => {
      repository.findPickTasksByWave.mockResolvedValue([
        { ...baseTask, status: "SHORT" },
      ]);

      await expect(service.cancelPickWave(waveId, "test")).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.updatePickWaveStatus).not.toHaveBeenCalled();
    });

    it("cancels all non-picked tasks and the wave itself when nothing has been picked yet", async () => {
      repository.findPickTasksByWave.mockResolvedValue([
        { ...baseTask, status: "OPEN" },
      ]);
      repository.cancelPickTask.mockResolvedValue({ ...baseTask, status: "CANCELLED" });
      repository.updatePickWaveStatus.mockResolvedValue({ ...baseWave, status: "CANCELLED" });

      const result = await service.cancelPickWave(waveId, "test");

      expect(repository.cancelPickTask).toHaveBeenCalledWith(baseTask.id, "test");
      expect(repository.updatePickWaveStatus).toHaveBeenCalledWith(waveId, "CANCELLED");
      expect(result.status).toBe("CANCELLED");
    });
  });

  describe("cancelPickTask", () => {
    it("refuses to cancel a PICKED task", async () => {
      repository.findPickTaskById.mockResolvedValue({ ...baseTask, status: "PICKED" });

      await expect(service.cancelPickTask("task-123", "test")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("refuses to cancel a SHORT task", async () => {
      repository.findPickTaskById.mockResolvedValue({ ...baseTask, status: "SHORT" });

      await expect(service.cancelPickTask("task-123", "test")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("reversePickTask", () => {
    it("throws when the task hasn't actually been picked", async () => {
      repository.findPickTaskById.mockResolvedValue({ ...baseTask, status: "OPEN" });

      await expect(service.reversePickTask("task-123", "test")).rejects.toThrow(
        BadRequestException,
      );
      expect(stockLedger.recordMovement).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when the task doesn't exist", async () => {
      repository.findPickTaskById.mockResolvedValue(null);

      await expect(service.reversePickTask("missing", "test")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("puts the stock back, re-reserves it, unpicks the reservation, and cancels the task", async () => {
      const pickedTask = { ...baseTask, status: "PICKED", qtyPicked: 1 };
      repository.findPickTaskById.mockResolvedValue(pickedTask);
      repository.reversePickTask.mockResolvedValue({ ...pickedTask, status: "CANCELLED", qtyPicked: 0 });

      const result = await service.reversePickTask("task-123", "customer cancelled", "user-456");

      expect(stockLedger.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: "item-123",
          toBinId: "bin-123",
          qty: 1,
          reason: "PICK_REVERSAL",
          batchNo: "BATCH-20260220-001",
          createdBy: "user-456",
        }),
      );
      expect(stockLedger.reserveStockWithBatch).toHaveBeenCalledWith(
        "tenant-123",
        "bin-123",
        "item-123",
        1,
        "BATCH-20260220-001",
        null,
      );
      expect(salesService.markReservationUnpicked).toHaveBeenCalledWith("res-123");
      expect(repository.reversePickTask).toHaveBeenCalledWith("task-123", "customer cancelled");
      expect(result.status).toBe("CANCELLED");
    });

    it("also accepts a SHORT task for reversal", async () => {
      const shortTask = { ...baseTask, status: "SHORT", qtyPicked: 1 };
      repository.findPickTaskById.mockResolvedValue(shortTask);
      repository.reversePickTask.mockResolvedValue({ ...shortTask, status: "CANCELLED", qtyPicked: 0 });

      await service.reversePickTask("task-123", "test");

      expect(stockLedger.recordMovement).toHaveBeenCalled();
      expect(repository.reversePickTask).toHaveBeenCalled();
    });
  });
});
