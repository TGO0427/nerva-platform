import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { FulfilmentService } from "./fulfilment.service";
import {
  FulfilmentRepository,
  PickWave,
  PickTask,
} from "./fulfilment.repository";
import { StockLedgerService } from "../inventory/stock-ledger.service";
import { SalesService } from "../sales/sales.service";

describe("FulfilmentService - cancelPickWave", () => {
  let service: FulfilmentService;
  let repository: jest.Mocked<FulfilmentRepository>;

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
            cancelPickTask: jest.fn(),
            updatePickWaveStatus: jest.fn(),
          },
        },
        { provide: StockLedgerService, useValue: {} },
        { provide: SalesService, useValue: {} },
      ],
    }).compile();

    service = module.get<FulfilmentService>(FulfilmentService);
    repository = module.get(FulfilmentRepository);

    repository.findPickWaveById.mockResolvedValue(baseWave);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
