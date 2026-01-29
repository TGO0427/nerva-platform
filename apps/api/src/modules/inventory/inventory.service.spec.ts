import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryRepository, Grn, GrnLine, Adjustment } from './inventory.repository';
import { StockLedgerService } from './stock-ledger.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let repository: jest.Mocked<InventoryRepository>;
  let stockLedger: jest.Mocked<StockLedgerService>;

  const mockGrn: Grn = {
    id: 'grn-123',
    tenantId: 'tenant-123',
    siteId: 'site-123',
    warehouseId: 'warehouse-123',
    grnNo: 'GRN-000001',
    status: 'DRAFT',
    purchaseOrderId: null,
    supplierId: null,
    receivedAt: null,
    notes: null,
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGrnLine: GrnLine = {
    id: 'line-123',
    tenantId: 'tenant-123',
    grnId: 'grn-123',
    purchaseOrderLineId: null,
    itemId: 'item-123',
    qtyExpected: 10,
    qtyReceived: 10,
    batchNo: 'BATCH001',
    expiryDate: null,
    receivingBinId: 'bin-123',
    createdAt: new Date(),
  };

  const mockAdjustment: Adjustment = {
    id: 'adj-123',
    tenantId: 'tenant-123',
    warehouseId: 'warehouse-123',
    adjustmentNo: 'ADJ-000001',
    status: 'DRAFT',
    reason: 'CYCLE_COUNT',
    notes: null,
    cycleCountId: null,
    createdBy: 'user-123',
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: InventoryRepository,
          useValue: {
            generateGrnNo: jest.fn(),
            createGrn: jest.fn(),
            findGrnById: jest.fn(),
            findGrnsByTenant: jest.fn(),
            updateGrnStatus: jest.fn(),
            addGrnLine: jest.fn(),
            getGrnLines: jest.fn(),
            generateAdjustmentNo: jest.fn(),
            createAdjustment: jest.fn(),
            findAdjustmentById: jest.fn(),
            findAdjustmentsByTenant: jest.fn(),
            approveAdjustment: jest.fn(),
          },
        },
        {
          provide: StockLedgerService,
          useValue: {
            recordMovement: jest.fn(),
            getStockOnHand: jest.fn(),
            getStockInBin: jest.fn(),
            getLedgerHistory: jest.fn(),
            getTotalAvailable: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    repository = module.get(InventoryRepository);
    stockLedger = module.get(StockLedgerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGrn', () => {
    it('should create a GRN with generated number', async () => {
      const createData = {
        tenantId: 'tenant-123',
        siteId: 'site-123',
        warehouseId: 'warehouse-123',
        createdBy: 'user-123',
      };

      repository.generateGrnNo.mockResolvedValue('GRN-000001');
      repository.createGrn.mockResolvedValue(mockGrn);

      const result = await service.createGrn(createData);

      expect(result).toEqual(mockGrn);
      expect(repository.generateGrnNo).toHaveBeenCalledWith('tenant-123');
      expect(repository.createGrn).toHaveBeenCalledWith({
        ...createData,
        grnNo: 'GRN-000001',
      });
    });
  });

  describe('getGrn', () => {
    it('should return GRN when found', async () => {
      repository.findGrnById.mockResolvedValue(mockGrn);

      const result = await service.getGrn('grn-123');

      expect(result).toEqual(mockGrn);
      expect(repository.findGrnById).toHaveBeenCalledWith('grn-123');
    });

    it('should throw NotFoundException when GRN not found', async () => {
      repository.findGrnById.mockResolvedValue(null);

      await expect(service.getGrn('grn-123')).rejects.toThrow(NotFoundException);
      await expect(service.getGrn('grn-123')).rejects.toThrow('GRN not found');
    });
  });

  describe('listGrns', () => {
    it('should return paginated GRNs', async () => {
      repository.findGrnsByTenant.mockResolvedValue([mockGrn]);

      const result = await service.listGrns('tenant-123', undefined, 1, 10);

      expect(result).toEqual({
        data: [mockGrn],
        meta: { page: 1, limit: 10 },
      });
      expect(repository.findGrnsByTenant).toHaveBeenCalledWith(
        'tenant-123',
        undefined,
        10,
        0,
      );
    });

    it('should filter by status', async () => {
      repository.findGrnsByTenant.mockResolvedValue([]);

      await service.listGrns('tenant-123', 'COMPLETE', 1, 10);

      expect(repository.findGrnsByTenant).toHaveBeenCalledWith(
        'tenant-123',
        'COMPLETE',
        10,
        0,
      );
    });

    it('should calculate correct offset for pagination', async () => {
      repository.findGrnsByTenant.mockResolvedValue([]);

      await service.listGrns('tenant-123', undefined, 3, 20);

      expect(repository.findGrnsByTenant).toHaveBeenCalledWith(
        'tenant-123',
        undefined,
        20,
        40, // (3-1) * 20 = 40
      );
    });
  });

  describe('receiveGrnLine', () => {
    const receiveData = {
      tenantId: 'tenant-123',
      itemId: 'item-123',
      qtyReceived: 10,
      batchNo: 'BATCH001',
      receivingBinId: 'bin-123',
      createdBy: 'user-123',
    };

    it('should receive items and record stock movement', async () => {
      repository.findGrnById.mockResolvedValue(mockGrn);
      repository.addGrnLine.mockResolvedValue(mockGrnLine);
      repository.updateGrnStatus.mockResolvedValue({ ...mockGrn, status: 'RECEIVED' });
      stockLedger.recordMovement.mockResolvedValue('ledger-123');

      const result = await service.receiveGrnLine('grn-123', receiveData);

      expect(result).toEqual(mockGrnLine);
      expect(stockLedger.recordMovement).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        siteId: 'site-123',
        itemId: 'item-123',
        toBinId: 'bin-123',
        qty: 10,
        reason: 'RECEIVE',
        refType: 'grn',
        refId: 'grn-123',
        batchNo: 'BATCH001',
        expiryDate: undefined,
        createdBy: 'user-123',
      });
    });

    it('should update GRN status from DRAFT to RECEIVED', async () => {
      repository.findGrnById.mockResolvedValue(mockGrn);
      repository.addGrnLine.mockResolvedValue(mockGrnLine);
      stockLedger.recordMovement.mockResolvedValue('ledger-123');

      await service.receiveGrnLine('grn-123', receiveData);

      expect(repository.updateGrnStatus).toHaveBeenCalledWith('grn-123', 'RECEIVED');
    });

    it('should not update status if already RECEIVED', async () => {
      const receivedGrn = { ...mockGrn, status: 'RECEIVED' };
      repository.findGrnById.mockResolvedValue(receivedGrn);
      repository.addGrnLine.mockResolvedValue(mockGrnLine);
      stockLedger.recordMovement.mockResolvedValue('ledger-123');

      await service.receiveGrnLine('grn-123', receiveData);

      expect(repository.updateGrnStatus).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for COMPLETE GRN', async () => {
      const completeGrn = { ...mockGrn, status: 'COMPLETE' };
      repository.findGrnById.mockResolvedValue(completeGrn);

      await expect(service.receiveGrnLine('grn-123', receiveData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.receiveGrnLine('grn-123', receiveData)).rejects.toThrow(
        'GRN is already complete or cancelled',
      );
    });

    it('should throw BadRequestException for CANCELLED GRN', async () => {
      const cancelledGrn = { ...mockGrn, status: 'CANCELLED' };
      repository.findGrnById.mockResolvedValue(cancelledGrn);

      await expect(service.receiveGrnLine('grn-123', receiveData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('completeGrn', () => {
    it('should complete a RECEIVED GRN', async () => {
      const receivedGrn = { ...mockGrn, status: 'RECEIVED' };
      const completeGrn = { ...mockGrn, status: 'COMPLETE' };
      repository.findGrnById.mockResolvedValue(receivedGrn);
      repository.updateGrnStatus.mockResolvedValue(completeGrn);

      const result = await service.completeGrn('grn-123');

      expect(result).toEqual(completeGrn);
      expect(repository.updateGrnStatus).toHaveBeenCalledWith('grn-123', 'COMPLETE');
    });

    it('should throw BadRequestException if GRN not in RECEIVED status', async () => {
      repository.findGrnById.mockResolvedValue(mockGrn); // DRAFT status

      await expect(service.completeGrn('grn-123')).rejects.toThrow(BadRequestException);
      await expect(service.completeGrn('grn-123')).rejects.toThrow(
        'GRN must be in RECEIVED status to complete',
      );
    });
  });

  describe('transferStock', () => {
    const transferData = {
      tenantId: 'tenant-123',
      siteId: 'site-123',
      itemId: 'item-123',
      fromBinId: 'bin-from',
      toBinId: 'bin-to',
      qty: 5,
      batchNo: 'BATCH001',
      createdBy: 'user-123',
    };

    it('should transfer stock when sufficient available', async () => {
      stockLedger.getTotalAvailable.mockResolvedValue(10);
      stockLedger.recordMovement.mockResolvedValue('ledger-123');

      await service.transferStock(transferData);

      expect(stockLedger.recordMovement).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        siteId: 'site-123',
        itemId: 'item-123',
        fromBinId: 'bin-from',
        toBinId: 'bin-to',
        qty: 5,
        reason: 'TRANSFER',
        batchNo: 'BATCH001',
        createdBy: 'user-123',
      });
    });

    it('should throw BadRequestException for insufficient stock', async () => {
      stockLedger.getTotalAvailable.mockResolvedValue(3);

      await expect(service.transferStock(transferData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.transferStock(transferData)).rejects.toThrow(
        'Insufficient stock available for transfer',
      );
    });
  });

  describe('createAdjustment', () => {
    it('should create adjustment with generated number', async () => {
      const createData = {
        tenantId: 'tenant-123',
        warehouseId: 'warehouse-123',
        reason: 'CYCLE_COUNT',
        createdBy: 'user-123',
      };

      repository.generateAdjustmentNo.mockResolvedValue('ADJ-000001');
      repository.createAdjustment.mockResolvedValue(mockAdjustment);

      const result = await service.createAdjustment(createData);

      expect(result).toEqual(mockAdjustment);
      expect(repository.generateAdjustmentNo).toHaveBeenCalledWith('tenant-123');
      expect(repository.createAdjustment).toHaveBeenCalledWith({
        ...createData,
        adjustmentNo: 'ADJ-000001',
      });
    });
  });

  describe('getAdjustment', () => {
    it('should return adjustment when found', async () => {
      repository.findAdjustmentById.mockResolvedValue(mockAdjustment);

      const result = await service.getAdjustment('adj-123');

      expect(result).toEqual(mockAdjustment);
    });

    it('should throw NotFoundException when adjustment not found', async () => {
      repository.findAdjustmentById.mockResolvedValue(null);

      await expect(service.getAdjustment('adj-123')).rejects.toThrow(NotFoundException);
      await expect(service.getAdjustment('adj-123')).rejects.toThrow('Adjustment not found');
    });
  });

  describe('approveAdjustment', () => {
    it('should approve adjustment', async () => {
      const approvedAdjustment = {
        ...mockAdjustment,
        status: 'APPROVED',
        approvedBy: 'admin-123',
        approvedAt: new Date(),
      };
      repository.approveAdjustment.mockResolvedValue(approvedAdjustment);

      const result = await service.approveAdjustment('adj-123', 'admin-123');

      expect(result).toEqual(approvedAdjustment);
      expect(repository.approveAdjustment).toHaveBeenCalledWith('adj-123', 'admin-123');
    });

    it('should throw BadRequestException when adjustment not in SUBMITTED status', async () => {
      repository.approveAdjustment.mockResolvedValue(null);

      await expect(service.approveAdjustment('adj-123', 'admin-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.approveAdjustment('adj-123', 'admin-123')).rejects.toThrow(
        'Adjustment not found or not in SUBMITTED status',
      );
    });
  });

  describe('getStockOnHand', () => {
    it('should delegate to stock ledger service', async () => {
      const mockStock = [
        { itemId: 'item-123', binId: 'bin-123', qtyOnHand: 10, qtyReserved: 2, qtyAvailable: 8, batchNo: null },
      ];
      stockLedger.getStockOnHand.mockResolvedValue(mockStock as any);

      const result = await service.getStockOnHand('tenant-123', 'item-123');

      expect(result).toEqual(mockStock);
      expect(stockLedger.getStockOnHand).toHaveBeenCalledWith('tenant-123', 'item-123');
    });
  });

  describe('getStockInBin', () => {
    it('should delegate to stock ledger service', async () => {
      const mockStock = [
        { itemId: 'item-123', binId: 'bin-123', qtyOnHand: 10, qtyReserved: 0, qtyAvailable: 10, batchNo: 'BATCH001' },
      ];
      stockLedger.getStockInBin.mockResolvedValue(mockStock as any);

      const result = await service.getStockInBin('tenant-123', 'bin-123');

      expect(result).toEqual(mockStock);
      expect(stockLedger.getStockInBin).toHaveBeenCalledWith('tenant-123', 'bin-123');
    });
  });

  describe('getLedgerHistory', () => {
    it('should return paginated ledger history', async () => {
      const mockHistory = [{ id: 'entry-1', qtyChange: 10 }];
      stockLedger.getLedgerHistory.mockResolvedValue(mockHistory as any);

      const result = await service.getLedgerHistory('tenant-123', 'item-123', 1, 20);

      expect(result).toEqual({
        data: mockHistory,
        meta: { page: 1, limit: 20 },
      });
      expect(stockLedger.getLedgerHistory).toHaveBeenCalledWith(
        'tenant-123',
        'item-123',
        20,
        0,
      );
    });
  });
});
