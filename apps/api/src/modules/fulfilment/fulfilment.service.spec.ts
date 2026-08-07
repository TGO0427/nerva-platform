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
            findTasksMissingRequiredBatch: jest.fn(),
            findPickTaskById: jest.fn(),
            cancelPickTask: jest.fn(),
            reversePickTask: jest.fn(),
            updatePickWaveStatus: jest.fn(),
            generateWaveNo: jest.fn(),
            createPickWave: jest.fn(),
            createPickTask: jest.fn(),
            confirmPickTask: jest.fn(),
            generateShipmentNo: jest.fn(),
            createShipment: jest.fn(),
            findShipmentById: jest.fn(),
            findPickedBatchesByOrderLine: jest.fn(),
            createShipmentLine: jest.fn(),
            sumShipmentWeight: jest.fn(),
            updateShipmentWeight: jest.fn(),
            updateShipmentStatus: jest.fn(),
            updateShipmentCarrier: jest.fn(),
            findShipmentLinesByShipment: jest.fn(),
            findBlockedBatchesByShipment: jest.fn(),
          },
        },
        {
          provide: StockLedgerService,
          useValue: {
            recordMovement: jest.fn(),
            reserveStockWithBatch: jest.fn(),
            releaseReservation: jest.fn(),
            getStockOnHand: jest.fn(),
          },
        },
        {
          provide: SalesService,
          useValue: {
            markReservationUnpicked: jest.fn(),
            getOrderWithLines: jest.fn(),
            getOrder: jest.fn(),
            updateOrderStatus: jest.fn(),
            getReservationsForOrderLine: jest.fn(),
            markReservationPicked: jest.fn(),
            incrementOrderLineQty: jest.fn(),
            tryAdvanceToPicked: jest.fn(),
          },
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

  describe("releasePickWave", () => {
    it("refuses to release a wave with no pick tasks", async () => {
      repository.findPickTasksByWave.mockResolvedValue([]);

      await expect(service.releasePickWave(waveId)).rejects.toThrow(
        "Cannot release an empty wave",
      );
      expect(repository.updatePickWaveStatus).not.toHaveBeenCalled();
    });

    it("releases a wave that has tasks and no missing-batch issues", async () => {
      repository.findPickTasksByWave.mockResolvedValue([baseTask]);
      repository.findTasksMissingRequiredBatch.mockResolvedValue([]);
      repository.updatePickWaveStatus.mockResolvedValue({ ...baseWave, status: "IN_PROGRESS" });

      const result = await service.releasePickWave(waveId);

      expect(result.status).toBe("IN_PROGRESS");
      expect(repository.updatePickWaveStatus).toHaveBeenCalledWith(waveId, "IN_PROGRESS");
    });

    it("still refuses when a batch-tracked item is missing its batch", async () => {
      repository.findPickTasksByWave.mockResolvedValue([baseTask]);
      repository.findTasksMissingRequiredBatch.mockResolvedValue([
        { itemSku: "FP-YOGURT-PEA" },
      ] as never);

      await expect(service.releasePickWave(waveId)).rejects.toThrow(
        "batch-tracked item(s) have no batch assigned",
      );
      expect(repository.updatePickWaveStatus).not.toHaveBeenCalled();
    });
  });

  describe("confirmPickTask", () => {
    it("throws when the task is already PICKED", async () => {
      repository.findPickTaskById.mockResolvedValue({ ...baseTask, status: "PICKED" });

      await expect(
        service.confirmPickTask("task-123", { qtyPicked: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws when the task is already CANCELLED", async () => {
      repository.findPickTaskById.mockResolvedValue({ ...baseTask, status: "CANCELLED" });

      await expect(
        service.confirmPickTask("task-123", { qtyPicked: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("records the movement, releases the reservation, and propagates the delta to the order line", async () => {
      repository.findPickTaskById.mockResolvedValue({ ...baseTask, qtyPicked: 0, qtyToPick: 5 });
      repository.confirmPickTask.mockResolvedValue({ ...baseTask, status: "PICKED", qtyPicked: 5 });

      const result = await service.confirmPickTask("task-123", { qtyPicked: 5, createdBy: "user-1" });

      expect(stockLedger.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: "item-123",
          fromBinId: "bin-123",
          qty: 5,
          reason: "PICK",
          batchNo: "BATCH-20260220-001",
        }),
      );
      expect(stockLedger.releaseReservation).toHaveBeenCalledWith(
        "tenant-123",
        "bin-123",
        "item-123",
        5, // releases the full reservation (qtyToPick), not the reported qtyPicked
        "BATCH-20260220-001",
      );
      expect(salesService.incrementOrderLineQty).toHaveBeenCalledWith(
        "sol-123",
        "qty_picked",
        5,
      );
      expect(salesService.tryAdvanceToPicked).toHaveBeenCalledWith(
        "tenant-123",
        "so-123",
      );
      expect(result.status).toBe("PICKED");
    });

    it("propagates only the delta when re-confirming a SHORT task with a higher cumulative qty", async () => {
      repository.findPickTaskById.mockResolvedValue({
        ...baseTask,
        status: "SHORT",
        qtyPicked: 2,
        qtyToPick: 5,
      });
      repository.confirmPickTask.mockResolvedValue({ ...baseTask, status: "PICKED", qtyPicked: 5 });

      await service.confirmPickTask("task-123", { qtyPicked: 5 });

      expect(salesService.incrementOrderLineQty).toHaveBeenCalledWith(
        "sol-123",
        "qty_picked",
        3, // 5 - 2, not the full 5
      );
    });

    it("does not touch the order line when the delta is zero", async () => {
      repository.findPickTaskById.mockResolvedValue({ ...baseTask, qtyPicked: 3, qtyToPick: 3 });
      repository.confirmPickTask.mockResolvedValue({ ...baseTask, status: "PICKED", qtyPicked: 3 });

      await service.confirmPickTask("task-123", { qtyPicked: 3 });

      expect(salesService.incrementOrderLineQty).not.toHaveBeenCalled();
    });
  });

  describe("createPickWave", () => {
    const orderData = {
      id: "so-123",
      orderNo: "SO-000001",
      status: "ALLOCATED",
      lines: [
        {
          id: "sol-123",
          itemId: "item-123",
          qtyOrdered: 5,
          qtyAllocated: 5,
          qtyPicked: 0,
        },
      ],
    };

    const reservation = {
      id: "res-123",
      tenantId: "tenant-123",
      salesOrderLineId: "sol-123",
      binId: "bin-123",
      itemId: "item-123",
      qty: 5,
      batchNo: "BATCH-20260220-001",
      status: "RESERVED",
      createdAt: new Date(),
    };

    beforeEach(() => {
      repository.generateWaveNo.mockResolvedValue("WAVE-000001");
      repository.createPickWave.mockResolvedValue(baseWave);
      repository.createPickTask.mockResolvedValue(baseTask);
    });

    it("creates a pick task per reservation and marks it picked, then advances the order to PICKING", async () => {
      salesService.getOrderWithLines.mockResolvedValue(orderData as never);
      salesService.getReservationsForOrderLine.mockResolvedValue([reservation] as never);

      const result = await service.createPickWave({
        tenantId: "tenant-123",
        warehouseId: "warehouse-123",
        orderIds: ["so-123"],
      });

      expect(repository.createPickTask).toHaveBeenCalledWith(
        expect.objectContaining({
          salesOrderLineId: "sol-123",
          fromBinId: "bin-123",
          qtyToPick: 5,
          batchNo: "BATCH-20260220-001",
          reservationId: "res-123",
        }),
      );
      expect(salesService.markReservationPicked).toHaveBeenCalledWith("res-123");
      expect(salesService.updateOrderStatus).toHaveBeenCalledWith(
        "tenant-123",
        "so-123",
        "PICKING",
      );
      expect(result.warnings).toEqual([]);
    });

    it("skips orders that are not ALLOCATED and warns instead", async () => {
      salesService.getOrderWithLines.mockResolvedValue({ ...orderData, status: "DRAFT" } as never);

      const result = await service.createPickWave({
        tenantId: "tenant-123",
        warehouseId: "warehouse-123",
        orderIds: ["so-123"],
      });

      expect(repository.createPickTask).not.toHaveBeenCalled();
      expect(salesService.updateOrderStatus).not.toHaveBeenCalled();
      expect(result.warnings).toEqual([
        { orderId: "so-123", orderNo: "SO-000001", reason: "Order is not allocated — no pick tasks were created" },
      ]);
    });

    it("falls back to on-hand stock when a line has no reservation (allocated before reservations existed)", async () => {
      salesService.getOrderWithLines.mockResolvedValue(orderData as never);
      salesService.getReservationsForOrderLine.mockResolvedValue([]);
      stockLedger.getStockOnHand.mockResolvedValue([
        { itemId: "item-123", binId: "bin-456", batchNo: "LEGACY", qtyOnHand: 5, qtyReserved: 0, qtyAvailable: 5 },
      ] as never);

      const result = await service.createPickWave({
        tenantId: "tenant-123",
        warehouseId: "warehouse-123",
        orderIds: ["so-123"],
      });

      expect(stockLedger.reserveStockWithBatch).toHaveBeenCalledWith(
        "tenant-123",
        "bin-456",
        "item-123",
        5,
        "LEGACY",
        undefined,
      );
      expect(repository.createPickTask).toHaveBeenCalledWith(
        expect.objectContaining({
          salesOrderLineId: "sol-123",
          fromBinId: "bin-456",
          qtyToPick: 5,
          batchNo: "LEGACY",
        }),
      );
      expect(result.warnings).toEqual([]);
      expect(salesService.updateOrderStatus).toHaveBeenCalledWith(
        "tenant-123",
        "so-123",
        "PICKING",
      );
    });

    it("warns and stays short when the fallback also can't cover the full quantity", async () => {
      salesService.getOrderWithLines.mockResolvedValue(orderData as never);
      salesService.getReservationsForOrderLine.mockResolvedValue([]);
      stockLedger.getStockOnHand.mockResolvedValue([
        { itemId: "item-123", binId: "bin-456", batchNo: "LEGACY", qtyOnHand: 2, qtyReserved: 0, qtyAvailable: 2 },
      ] as never);

      const result = await service.createPickWave({
        tenantId: "tenant-123",
        warehouseId: "warehouse-123",
        orderIds: ["so-123"],
      });

      expect(repository.createPickTask).toHaveBeenCalledWith(
        expect.objectContaining({ qtyToPick: 2 }),
      );
      expect(result.warnings).toEqual([
        expect.objectContaining({ orderId: "so-123", reason: expect.stringContaining("Insufficient on-hand stock") }),
      ]);
      // A task *was* created (short), so the order still advances to PICKING.
      expect(salesService.updateOrderStatus).toHaveBeenCalledWith(
        "tenant-123",
        "so-123",
        "PICKING",
      );
    });

    it("leaves the order ALLOCATED and warns when absolutely no stock is available", async () => {
      salesService.getOrderWithLines.mockResolvedValue(orderData as never);
      salesService.getReservationsForOrderLine.mockResolvedValue([]);
      stockLedger.getStockOnHand.mockResolvedValue([]);

      const result = await service.createPickWave({
        tenantId: "tenant-123",
        warehouseId: "warehouse-123",
        orderIds: ["so-123"],
      });

      expect(repository.createPickTask).not.toHaveBeenCalled();
      expect(salesService.updateOrderStatus).not.toHaveBeenCalled();
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ orderId: "so-123", reason: expect.stringContaining("No pick tasks could be created") }),
        ]),
      );
    });
  });

  describe("createShipment", () => {
    const mockShipment = {
      id: "shipment-123",
      tenantId: "tenant-123",
      siteId: "site-123",
      warehouseId: "warehouse-123",
      salesOrderId: "so-123",
      orderNo: "SO-000001",
      shipmentNo: "SHP-000001",
      status: "PENDING",
      totalWeightKg: 0,
      totalCbm: 0,
      carrier: null,
      trackingNo: null,
      createdBy: null,
      createdByName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("throws when the order is not fully picked (status PICKED)", async () => {
      salesService.getOrder.mockResolvedValue({ id: "so-123", status: "PICKING" } as never);

      await expect(
        service.createShipment({ tenantId: "tenant-123", salesOrderId: "so-123" }),
      ).rejects.toThrow("Order must be fully picked (status PICKED) before a shipment can be created");
    });

    it("creates a shipment line per picked batch and cascades the order to PACKING", async () => {
      salesService.getOrder.mockResolvedValue({
        id: "so-123",
        status: "PICKED",
        siteId: "site-123",
        warehouseId: "warehouse-123",
      } as never);
      repository.generateShipmentNo.mockResolvedValue("SHP-000001");
      repository.createShipment.mockResolvedValue(mockShipment);
      salesService.getOrderWithLines.mockResolvedValue({
        lines: [{ id: "sol-123", itemId: "item-123", qtyPicked: 5 }],
      } as never);
      repository.findPickedBatchesByOrderLine.mockResolvedValue([
        { batchNo: "BATCH-20260220-001", qtyPicked: 5 },
      ] as never);
      repository.sumShipmentWeight.mockResolvedValue(12.5);
      repository.findShipmentById.mockResolvedValue({ ...mockShipment, totalWeightKg: 12.5 });

      const result = await service.createShipment({
        tenantId: "tenant-123",
        salesOrderId: "so-123",
      });

      expect(repository.createShipmentLine).toHaveBeenCalledWith(
        expect.objectContaining({
          shipmentId: "shipment-123",
          salesOrderLineId: "sol-123",
          qty: 5,
          batchNo: "BATCH-20260220-001",
        }),
      );
      expect(repository.updateShipmentWeight).toHaveBeenCalledWith("shipment-123", 12.5);
      expect(salesService.updateOrderStatus).toHaveBeenCalledWith(
        "tenant-123",
        "so-123",
        "PACKING",
      );
      expect(result.totalWeightKg).toBe(12.5);
    });
  });

  describe("shipment lifecycle cascades", () => {
    const shipment = {
      id: "shipment-123",
      tenantId: "tenant-123",
      salesOrderId: "so-123",
      status: "PENDING",
    };

    it("packShipment throws unless the shipment is PENDING", async () => {
      repository.findShipmentById.mockResolvedValue({ ...shipment, status: "PACKED" } as never);

      await expect(service.packShipment("shipment-123")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("packShipment applies qty_packed to order lines and cascades the order to PACKED", async () => {
      repository.findShipmentById.mockResolvedValue(shipment as never);
      repository.updateShipmentStatus.mockResolvedValue({ ...shipment, status: "PACKED" } as never);
      repository.findShipmentLinesByShipment.mockResolvedValue([
        { salesOrderLineId: "sol-123", qty: 5 },
      ] as never);

      await service.packShipment("shipment-123");

      expect(salesService.incrementOrderLineQty).toHaveBeenCalledWith("sol-123", "qty_packed", 5);
      expect(salesService.updateOrderStatus).toHaveBeenCalledWith("tenant-123", "so-123", "PACKED");
    });

    it("shipShipment throws when a batch is blocked from dispatch", async () => {
      repository.findShipmentById.mockResolvedValue({ ...shipment, status: "PACKED" } as never);
      repository.findBlockedBatchesByShipment.mockResolvedValue([
        { itemSku: "FP-YOGURT-PEA", batchNo: "BATCH-20260220-001" },
      ] as never);

      await expect(
        service.shipShipment("shipment-123", { carrier: "DHL", trackingNo: "TRK-1" }),
      ).rejects.toThrow("Cannot ship: batch not cleared for dispatch");
      expect(repository.updateShipmentCarrier).not.toHaveBeenCalled();
    });

    it("shipShipment applies qty_shipped to order lines and cascades the order to SHIPPED", async () => {
      repository.findShipmentById.mockResolvedValue({ ...shipment, status: "PACKED" } as never);
      repository.findBlockedBatchesByShipment.mockResolvedValue([]);
      repository.updateShipmentCarrier.mockResolvedValue({ ...shipment, status: "PACKED" } as never);
      repository.findShipmentLinesByShipment.mockResolvedValue([
        { salesOrderLineId: "sol-123", qty: 5 },
      ] as never);

      await service.shipShipment("shipment-123", { carrier: "DHL", trackingNo: "TRK-1" });

      expect(salesService.incrementOrderLineQty).toHaveBeenCalledWith("sol-123", "qty_shipped", 5);
      expect(salesService.updateOrderStatus).toHaveBeenCalledWith("tenant-123", "so-123", "SHIPPED");
    });

    it("deliverShipment throws unless the shipment is SHIPPED", async () => {
      repository.findShipmentById.mockResolvedValue({ ...shipment, status: "PACKED" } as never);

      await expect(service.deliverShipment("shipment-123")).rejects.toThrow(
        "Shipment must be shipped before delivery",
      );
    });

    it("deliverShipment cascades the order to DELIVERED", async () => {
      repository.findShipmentById.mockResolvedValue({ ...shipment, status: "SHIPPED" } as never);
      repository.updateShipmentStatus.mockResolvedValue({ ...shipment, status: "DELIVERED" } as never);

      await service.deliverShipment("shipment-123");

      expect(salesService.updateOrderStatus).toHaveBeenCalledWith("tenant-123", "so-123", "DELIVERED");
    });
  });
});
