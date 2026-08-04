import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { IbtService } from "./ibt.service";
import { IbtRepository, IbtDetail, IbtLineDetail } from "./ibt.repository";
import { StockLedgerService } from "./stock-ledger.service";
import { MasterDataService } from "../masterdata/masterdata.service";

describe("IbtService", () => {
  let service: IbtService;
  let ibtRepo: jest.Mocked<IbtRepository>;
  let stockLedger: jest.Mocked<StockLedgerService>;
  let masterDataService: jest.Mocked<MasterDataService>;

  const tenantId = "tenant-123";
  const ibtId = "ibt-123";

  const baseIbt: IbtDetail = {
    id: ibtId,
    tenantId,
    ibtNo: "IBT-000001",
    fromWarehouseId: "warehouse-from",
    toWarehouseId: "warehouse-to",
    status: "PICKING",
    notes: null,
    createdBy: "user-123",
    approvedBy: null,
    approvedAt: null,
    shippedAt: null,
    receivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    fromWarehouseName: "From Warehouse",
    toWarehouseName: "To Warehouse",
    createdByName: null,
    approvedByName: null,
    lineCount: 1,
  };

  const baseLine: IbtLineDetail = {
    id: "line-123",
    tenantId,
    ibtId,
    itemId: "item-123",
    qtyRequested: 10,
    qtyShipped: 0,
    qtyReceived: 0,
    fromBinId: "bin-from",
    toBinId: null,
    batchNo: "BATCH-001",
    createdAt: new Date(),
    itemSku: "SKU-001",
    itemDescription: "Test Item",
    fromBinCode: "A-01",
    toBinCode: null,
  };

  const baseItem = {
    id: "item-123",
    tenantId,
    sku: "SKU-001",
    description: "Test Item",
    uom: "EA",
    weightKg: null,
    hsCode: null,
    countryOfOrigin: null,
    isActive: true,
    requiresBatchTracking: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IbtService,
        {
          provide: IbtRepository,
          useValue: {
            findById: jest.fn(),
            getLines: jest.fn(),
            updateLineShipped: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
        {
          provide: StockLedgerService,
          useValue: {
            recordMovement: jest.fn(),
            getStockInBin: jest.fn(),
          },
        },
        {
          provide: MasterDataService,
          useValue: {
            getItem: jest.fn(),
            getWarehouse: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IbtService>(IbtService);
    ibtRepo = module.get(IbtRepository);
    stockLedger = module.get(StockLedgerService);
    masterDataService = module.get(MasterDataService);

    ibtRepo.findById.mockResolvedValue(baseIbt);
    ibtRepo.getLines.mockResolvedValue([baseLine]);
    masterDataService.getWarehouse.mockResolvedValue({
      id: "warehouse-from",
      tenantId,
      siteId: "site-123",
      name: "From Warehouse",
      code: "WH-FROM",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    masterDataService.getItem.mockResolvedValue(baseItem);
    stockLedger.getStockInBin.mockResolvedValue([
      {
        itemId: "item-123",
        binId: "bin-from",
        batchNo: "BATCH-001",
        expiryDate: null,
        qtyOnHand: 10,
        qtyReserved: 0,
        qtyAvailable: 10,
      },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("shipLines", () => {
    it("should throw BadRequestException when a batch-tracked item has no batch", async () => {
      ibtRepo.getLines.mockResolvedValue([{ ...baseLine, batchNo: null }]);
      masterDataService.getItem.mockResolvedValue({
        ...baseItem,
        requiresBatchTracking: true,
      });

      await expect(
        service.shipLines(
          tenantId,
          ibtId,
          [{ lineId: "line-123", qtyShipped: 5 }],
          "user-123",
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.shipLines(
          tenantId,
          ibtId,
          [{ lineId: "line-123", qtyShipped: 5 }],
          "user-123",
        ),
      ).rejects.toThrow("SKU-001 requires a batch/lot number to be transferred");

      expect(stockLedger.recordMovement).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when shipping more than is available in that batch", async () => {
      stockLedger.getStockInBin.mockResolvedValue([
        {
          itemId: "item-123",
          binId: "bin-from",
          batchNo: "BATCH-001",
          expiryDate: null,
          qtyOnHand: 3,
          qtyReserved: 0,
          qtyAvailable: 3,
        },
      ]);

      await expect(
        service.shipLines(
          tenantId,
          ibtId,
          [{ lineId: "line-123", qtyShipped: 5 }],
          "user-123",
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.shipLines(
          tenantId,
          ibtId,
          [{ lineId: "line-123", qtyShipped: 5 }],
          "user-123",
        ),
      ).rejects.toThrow(
        "Insufficient stock for SKU-001 in batch BATCH-001 — only 3 available",
      );

      expect(stockLedger.recordMovement).not.toHaveBeenCalled();
    });

    it("should ship successfully when batch and quantity are valid", async () => {
      ibtRepo.updateStatus.mockResolvedValue(undefined as any);

      await service.shipLines(
        tenantId,
        ibtId,
        [{ lineId: "line-123", qtyShipped: 5 }],
        "user-123",
      );

      expect(stockLedger.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: "item-123",
          fromBinId: "bin-from",
          qty: 5,
          reason: "IBT_OUT",
          batchNo: "BATCH-001",
        }),
      );
      expect(ibtRepo.updateLineShipped).toHaveBeenCalledWith("line-123", 5);
    });
  });
});
