import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesRepository, SalesOrder, SalesOrderLine } from './sales.repository';
import { StockLedgerService } from '../inventory/stock-ledger.service';

describe('SalesService', () => {
  let service: SalesService;
  let repository: jest.Mocked<SalesRepository>;
  let stockLedger: jest.Mocked<StockLedgerService>;

  const mockOrder: SalesOrder = {
    id: 'order-123',
    tenantId: 'tenant-123',
    siteId: 'site-123',
    warehouseId: 'warehouse-123',
    customerId: 'customer-123',
    orderNo: 'SO-000001',
    status: 'DRAFT',
    externalRef: null,
    priority: 5,
    requestedShipDate: null,
    shippingAddressLine1: '123 Main St',
    shippingCity: 'New York',
    notes: null,
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrderLine: SalesOrderLine = {
    id: 'line-123',
    tenantId: 'tenant-123',
    salesOrderId: 'order-123',
    lineNo: 1,
    itemId: 'item-123',
    qtyOrdered: 10,
    qtyAllocated: 0,
    qtyPicked: 0,
    qtyPacked: 0,
    qtyShipped: 0,
    unitPrice: 9.99,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: SalesRepository,
          useValue: {
            generateOrderNo: jest.fn(),
            createOrder: jest.fn(),
            findOrderById: jest.fn(),
            findOrdersByTenant: jest.fn(),
            updateOrderStatus: jest.fn(),
            addOrderLine: jest.fn(),
            getOrderLines: jest.fn(),
            updateOrderLineQty: jest.fn(),
          },
        },
        {
          provide: StockLedgerService,
          useValue: {
            getTotalAvailable: jest.fn(),
            getStockOnHand: jest.fn(),
            reserveStock: jest.fn(),
            releaseReservation: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    repository = module.get(SalesRepository);
    stockLedger = module.get(StockLedgerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const createData = {
      tenantId: 'tenant-123',
      siteId: 'site-123',
      warehouseId: 'warehouse-123',
      customerId: 'customer-123',
      priority: 5,
      shippingAddressLine1: '123 Main St',
      shippingCity: 'New York',
      createdBy: 'user-123',
      lines: [
        { itemId: 'item-123', qtyOrdered: 10, unitPrice: 9.99 },
        { itemId: 'item-456', qtyOrdered: 5, unitPrice: 19.99 },
      ],
    };

    it('should create order with generated number and add lines', async () => {
      repository.generateOrderNo.mockResolvedValue('SO-000001');
      repository.createOrder.mockResolvedValue(mockOrder);
      repository.addOrderLine.mockResolvedValue(mockOrderLine);

      const result = await service.createOrder(createData);

      expect(result).toEqual(mockOrder);
      expect(repository.generateOrderNo).toHaveBeenCalledWith('tenant-123');
      expect(repository.createOrder).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        siteId: 'site-123',
        warehouseId: 'warehouse-123',
        customerId: 'customer-123',
        orderNo: 'SO-000001',
        priority: 5,
        shippingAddressLine1: '123 Main St',
        shippingCity: 'New York',
        createdBy: 'user-123',
        externalRef: undefined,
        requestedShipDate: undefined,
        notes: undefined,
      });
      expect(repository.addOrderLine).toHaveBeenCalledTimes(2);
    });

    it('should add order lines with correct line numbers', async () => {
      repository.generateOrderNo.mockResolvedValue('SO-000001');
      repository.createOrder.mockResolvedValue(mockOrder);
      repository.addOrderLine.mockResolvedValue(mockOrderLine);

      await service.createOrder(createData);

      expect(repository.addOrderLine).toHaveBeenNthCalledWith(1, {
        tenantId: 'tenant-123',
        salesOrderId: 'order-123',
        lineNo: 1,
        itemId: 'item-123',
        qtyOrdered: 10,
        unitPrice: 9.99,
      });
      expect(repository.addOrderLine).toHaveBeenNthCalledWith(2, {
        tenantId: 'tenant-123',
        salesOrderId: 'order-123',
        lineNo: 2,
        itemId: 'item-456',
        qtyOrdered: 5,
        unitPrice: 19.99,
      });
    });
  });

  describe('getOrder', () => {
    it('should return order when found', async () => {
      repository.findOrderById.mockResolvedValue(mockOrder);

      const result = await service.getOrder('order-123');

      expect(result).toEqual(mockOrder);
      expect(repository.findOrderById).toHaveBeenCalledWith('order-123');
    });

    it('should throw NotFoundException when order not found', async () => {
      repository.findOrderById.mockResolvedValue(null);

      await expect(service.getOrder('order-123')).rejects.toThrow(NotFoundException);
      await expect(service.getOrder('order-123')).rejects.toThrow('Sales order not found');
    });
  });

  describe('getOrderWithLines', () => {
    it('should return order with lines', async () => {
      repository.findOrderById.mockResolvedValue(mockOrder);
      repository.getOrderLines.mockResolvedValue([mockOrderLine]);

      const result = await service.getOrderWithLines('order-123');

      expect(result).toEqual({
        order: mockOrder,
        lines: [mockOrderLine],
      });
    });
  });

  describe('listOrders', () => {
    it('should return paginated orders', async () => {
      repository.findOrdersByTenant.mockResolvedValue([mockOrder]);

      const result = await service.listOrders('tenant-123', {}, 1, 10);

      expect(result).toEqual({
        data: [mockOrder],
        meta: { page: 1, limit: 10 },
      });
      expect(repository.findOrdersByTenant).toHaveBeenCalledWith(
        'tenant-123',
        {},
        10,
        0,
      );
    });

    it('should pass filters to repository', async () => {
      repository.findOrdersByTenant.mockResolvedValue([]);

      await service.listOrders('tenant-123', { status: 'CONFIRMED', customerId: 'cust-1' }, 1, 10);

      expect(repository.findOrdersByTenant).toHaveBeenCalledWith(
        'tenant-123',
        { status: 'CONFIRMED', customerId: 'cust-1' },
        10,
        0,
      );
    });
  });

  describe('confirmOrder', () => {
    it('should confirm a draft order', async () => {
      const confirmedOrder = { ...mockOrder, status: 'CONFIRMED' };
      repository.findOrderById.mockResolvedValue(mockOrder);
      repository.updateOrderStatus.mockResolvedValue(confirmedOrder);

      const result = await service.confirmOrder('order-123');

      expect(result).toEqual(confirmedOrder);
      expect(repository.updateOrderStatus).toHaveBeenCalledWith('order-123', 'CONFIRMED');
    });

    it('should throw BadRequestException for non-draft order', async () => {
      const confirmedOrder = { ...mockOrder, status: 'CONFIRMED' };
      repository.findOrderById.mockResolvedValue(confirmedOrder);

      await expect(service.confirmOrder('order-123')).rejects.toThrow(BadRequestException);
      await expect(service.confirmOrder('order-123')).rejects.toThrow(
        'Only draft orders can be confirmed',
      );
    });
  });

  describe('allocateOrder', () => {
    const confirmedOrder = { ...mockOrder, status: 'CONFIRMED' };
    const allocatedOrder = { ...mockOrder, status: 'ALLOCATED' };

    it('should allocate stock for a confirmed order', async () => {
      repository.findOrderById.mockResolvedValue(confirmedOrder);
      repository.getOrderLines.mockResolvedValue([mockOrderLine]);
      stockLedger.getTotalAvailable.mockResolvedValue(20);
      stockLedger.getStockOnHand.mockResolvedValue([
        { itemId: 'item-123', binId: 'bin-1', qtyOnHand: 20, qtyReserved: 0, qtyAvailable: 20, batchNo: null },
      ]);
      stockLedger.reserveStock.mockResolvedValue(undefined);
      repository.updateOrderLineQty.mockResolvedValue(undefined);
      repository.updateOrderStatus.mockResolvedValue(allocatedOrder);

      const result = await service.allocateOrder('order-123');

      expect(result).toEqual(allocatedOrder);
      expect(stockLedger.reserveStock).toHaveBeenCalledWith(
        'tenant-123',
        'bin-1',
        'item-123',
        10,
        undefined,
      );
      expect(repository.updateOrderLineQty).toHaveBeenCalledWith('line-123', 'qty_allocated', 10);
    });

    it('should partially allocate when insufficient stock', async () => {
      repository.findOrderById.mockResolvedValue(confirmedOrder);
      repository.getOrderLines.mockResolvedValue([mockOrderLine]); // needs 10
      stockLedger.getTotalAvailable.mockResolvedValue(5); // only 5 available
      stockLedger.getStockOnHand.mockResolvedValue([
        { itemId: 'item-123', binId: 'bin-1', qtyOnHand: 5, qtyReserved: 0, qtyAvailable: 5, batchNo: null },
      ]);
      stockLedger.reserveStock.mockResolvedValue(undefined);
      repository.updateOrderLineQty.mockResolvedValue(undefined);
      repository.updateOrderStatus.mockResolvedValue(allocatedOrder);

      await service.allocateOrder('order-123');

      expect(stockLedger.reserveStock).toHaveBeenCalledWith(
        'tenant-123',
        'bin-1',
        'item-123',
        5,
        undefined,
      );
      expect(repository.updateOrderLineQty).toHaveBeenCalledWith('line-123', 'qty_allocated', 5);
    });

    it('should allocate from multiple bins', async () => {
      repository.findOrderById.mockResolvedValue(confirmedOrder);
      repository.getOrderLines.mockResolvedValue([mockOrderLine]); // needs 10
      stockLedger.getTotalAvailable.mockResolvedValue(10);
      stockLedger.getStockOnHand.mockResolvedValue([
        { itemId: 'item-123', binId: 'bin-1', qtyOnHand: 6, qtyReserved: 0, qtyAvailable: 6, batchNo: null },
        { itemId: 'item-123', binId: 'bin-2', qtyOnHand: 4, qtyReserved: 0, qtyAvailable: 4, batchNo: 'BATCH1' },
      ]);
      stockLedger.reserveStock.mockResolvedValue(undefined);
      repository.updateOrderLineQty.mockResolvedValue(undefined);
      repository.updateOrderStatus.mockResolvedValue(allocatedOrder);

      await service.allocateOrder('order-123');

      expect(stockLedger.reserveStock).toHaveBeenCalledTimes(2);
      expect(stockLedger.reserveStock).toHaveBeenNthCalledWith(
        1,
        'tenant-123',
        'bin-1',
        'item-123',
        6,
        undefined,
      );
      expect(stockLedger.reserveStock).toHaveBeenNthCalledWith(
        2,
        'tenant-123',
        'bin-2',
        'item-123',
        4,
        'BATCH1',
      );
    });

    it('should throw BadRequestException for non-confirmed order', async () => {
      repository.findOrderById.mockResolvedValue(mockOrder); // DRAFT status

      await expect(service.allocateOrder('order-123')).rejects.toThrow(BadRequestException);
      await expect(service.allocateOrder('order-123')).rejects.toThrow(
        'Only confirmed orders can be allocated',
      );
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a draft order', async () => {
      const cancelledOrder = { ...mockOrder, status: 'CANCELLED' };
      repository.findOrderById.mockResolvedValue(mockOrder);
      repository.getOrderLines.mockResolvedValue([mockOrderLine]);
      repository.updateOrderStatus.mockResolvedValue(cancelledOrder);

      const result = await service.cancelOrder('order-123');

      expect(result).toEqual(cancelledOrder);
      expect(repository.updateOrderStatus).toHaveBeenCalledWith('order-123', 'CANCELLED');
    });

    it('should release reservations when cancelling allocated order', async () => {
      const allocatedOrder = { ...mockOrder, status: 'ALLOCATED' };
      const allocatedLine = { ...mockOrderLine, qtyAllocated: 10 };
      const cancelledOrder = { ...mockOrder, status: 'CANCELLED' };

      repository.findOrderById.mockResolvedValue(allocatedOrder);
      repository.getOrderLines.mockResolvedValue([allocatedLine]);
      stockLedger.getStockOnHand.mockResolvedValue([
        { itemId: 'item-123', binId: 'bin-1', qtyOnHand: 10, qtyReserved: 10, qtyAvailable: 0, batchNo: null },
      ]);
      stockLedger.releaseReservation.mockResolvedValue(undefined);
      repository.updateOrderStatus.mockResolvedValue(cancelledOrder);

      await service.cancelOrder('order-123');

      expect(stockLedger.releaseReservation).toHaveBeenCalledWith(
        'tenant-123',
        'bin-1',
        'item-123',
        10,
        undefined,
      );
    });

    it('should throw BadRequestException for shipped order', async () => {
      const shippedOrder = { ...mockOrder, status: 'SHIPPED' };
      repository.findOrderById.mockResolvedValue(shippedOrder);

      await expect(service.cancelOrder('order-123')).rejects.toThrow(BadRequestException);
      await expect(service.cancelOrder('order-123')).rejects.toThrow(
        'Cannot cancel order in current status',
      );
    });

    it('should throw BadRequestException for delivered order', async () => {
      const deliveredOrder = { ...mockOrder, status: 'DELIVERED' };
      repository.findOrderById.mockResolvedValue(deliveredOrder);

      await expect(service.cancelOrder('order-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already cancelled order', async () => {
      const cancelledOrder = { ...mockOrder, status: 'CANCELLED' };
      repository.findOrderById.mockResolvedValue(cancelledOrder);

      await expect(service.cancelOrder('order-123')).rejects.toThrow(BadRequestException);
    });
  });
});
