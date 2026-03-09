import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { ReturnsService } from "./returns.service";
import {
  ReturnsRepository,
  Rma,
  RmaLine,
  CreditNoteDraft,
} from "./returns.repository";
import { StockLedgerService } from "../inventory/stock-ledger.service";

describe("ReturnsService", () => {
  let service: ReturnsService;
  let repository: jest.Mocked<ReturnsRepository>;
  let stockLedger: jest.Mocked<StockLedgerService>;

  const mockRma: Rma = {
    id: "rma-123",
    tenantId: "tenant-123",
    siteId: "site-123",
    warehouseId: "warehouse-123",
    customerId: "customer-123",
    salesOrderId: "order-123",
    shipmentId: null,
    rmaNo: "RMA-000001",
    status: "OPEN",
    returnType: "CUSTOMER",
    notes: null,
    createdBy: "user-123",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRmaLine: RmaLine = {
    id: "line-123",
    tenantId: "tenant-123",
    rmaId: "rma-123",
    salesOrderLineId: null,
    itemId: "item-123",
    qtyExpected: 5,
    qtyReceived: 0,
    reasonCode: "DAMAGED",
    disposition: "PENDING",
    dispositionBinId: null,
    inspectionNotes: null,
    inspectedBy: null,
    inspectedAt: null,
    unitCreditAmount: 10.0,
    createdAt: new Date(),
  };

  const mockCreditNote: CreditNoteDraft = {
    id: "cn-123",
    tenantId: "tenant-123",
    rmaId: "rma-123",
    creditNo: "CN-000001",
    status: "DRAFT",
    subtotal: 50.0,
    taxAmount: 7.5,
    totalAmount: 57.5,
    currency: "ZAR",
    notes: null,
    createdBy: "user-123",
    approvedBy: null,
    approvedAt: null,
    postedAt: null,
    externalRef: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnsService,
        {
          provide: ReturnsRepository,
          useValue: {
            generateRmaNo: jest.fn(),
            createRma: jest.fn(),
            findRmaById: jest.fn(),
            findRmasByTenant: jest.fn(),
            countRmasByTenant: jest.fn(),
            addRmaLine: jest.fn(),
            findRmaLineById: jest.fn(),
            getRmaLines: jest.fn(),
            receiveRmaLine: jest.fn(),
            setLineDisposition: jest.fn(),
            updateRmaStatus: jest.fn(),
            deleteRma: jest.fn(),
            generateCreditNo: jest.fn(),
            createCreditNoteDraft: jest.fn(),
            findCreditNoteById: jest.fn(),
            findCreditNotesByTenant: jest.fn(),
            countCreditNotesByTenant: jest.fn(),
            approveCreditNote: jest.fn(),
            postCreditNote: jest.fn(),
            cancelCreditNote: jest.fn(),
            deleteCreditNote: jest.fn(),
          },
        },
        {
          provide: StockLedgerService,
          useValue: {
            recordMovement: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReturnsService>(ReturnsService);
    repository = module.get(ReturnsRepository);
    stockLedger = module.get(StockLedgerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- RMA CRUD ---

  describe("createRma", () => {
    it("should create RMA with generated number and add lines", async () => {
      repository.generateRmaNo.mockResolvedValue("RMA-000001");
      repository.createRma.mockResolvedValue(mockRma);
      repository.addRmaLine.mockResolvedValue(mockRmaLine);

      const result = await service.createRma({
        tenantId: "tenant-123",
        siteId: "site-123",
        warehouseId: "warehouse-123",
        customerId: "customer-123",
        lines: [
          { itemId: "item-123", qtyExpected: 5, reasonCode: "DAMAGED" },
        ],
      });

      expect(result).toEqual(mockRma);
      expect(repository.generateRmaNo).toHaveBeenCalledWith("tenant-123");
      expect(repository.addRmaLine).toHaveBeenCalledTimes(1);
      expect(repository.addRmaLine).toHaveBeenCalledWith({
        tenantId: "tenant-123",
        rmaId: "rma-123",
        itemId: "item-123",
        qtyExpected: 5,
        reasonCode: "DAMAGED",
      });
    });

    it("should add multiple lines", async () => {
      repository.generateRmaNo.mockResolvedValue("RMA-000001");
      repository.createRma.mockResolvedValue(mockRma);
      repository.addRmaLine.mockResolvedValue(mockRmaLine);

      await service.createRma({
        tenantId: "tenant-123",
        siteId: "site-123",
        warehouseId: "warehouse-123",
        customerId: "customer-123",
        lines: [
          { itemId: "item-1", qtyExpected: 3, reasonCode: "DAMAGED" },
          { itemId: "item-2", qtyExpected: 2, reasonCode: "WRONG_ITEM" },
        ],
      });

      expect(repository.addRmaLine).toHaveBeenCalledTimes(2);
    });
  });

  describe("getRma", () => {
    it("should return RMA when found", async () => {
      repository.findRmaById.mockResolvedValue(mockRma);

      const result = await service.getRma("rma-123");

      expect(result).toEqual(mockRma);
      expect(repository.findRmaById).toHaveBeenCalledWith("rma-123");
    });

    it("should throw NotFoundException when RMA not found", async () => {
      repository.findRmaById.mockResolvedValue(null);

      await expect(service.getRma("missing")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getRma("missing")).rejects.toThrow(
        "RMA not found",
      );
    });
  });

  describe("getRmaWithLines", () => {
    it("should return RMA with its lines", async () => {
      repository.findRmaById.mockResolvedValue(mockRma);
      repository.getRmaLines.mockResolvedValue([mockRmaLine]);

      const result = await service.getRmaWithLines("rma-123");

      expect(result.rma).toEqual(mockRma);
      expect(result.lines).toEqual([mockRmaLine]);
    });
  });

  describe("listRmas", () => {
    it("should return paginated RMAs", async () => {
      repository.findRmasByTenant.mockResolvedValue([mockRma]);
      repository.countRmasByTenant.mockResolvedValue(1);

      const result = await service.listRmas(
        "tenant-123",
        "site-123",
        {},
        1,
        10,
      );

      expect(result.data).toEqual([mockRma]);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });
  });

  // --- RMA status transitions ---

  describe("deleteRma", () => {
    it("should delete an OPEN RMA", async () => {
      repository.findRmaById.mockResolvedValue(mockRma);
      repository.deleteRma.mockResolvedValue(true);

      await service.deleteRma("rma-123");

      expect(repository.deleteRma).toHaveBeenCalledWith("rma-123");
    });

    it("should throw NotFoundException when RMA not found", async () => {
      repository.findRmaById.mockResolvedValue(null);

      await expect(service.deleteRma("missing")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException for non-OPEN RMA", async () => {
      const receivedRma = { ...mockRma, status: "RECEIVED" };
      repository.findRmaById.mockResolvedValue(receivedRma);

      await expect(service.deleteRma("rma-123")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteRma("rma-123")).rejects.toThrow(
        "Only OPEN RMAs can be deleted",
      );
    });
  });

  describe("closeRma", () => {
    it("should close a DISPOSITIONED RMA", async () => {
      const dispositionedRma = { ...mockRma, status: "DISPOSITIONED" };
      const closedRma = { ...mockRma, status: "CLOSED" };
      repository.findRmaById.mockResolvedValue(dispositionedRma);
      repository.updateRmaStatus.mockResolvedValue(closedRma);

      const result = await service.closeRma("rma-123");

      expect(result.status).toBe("CLOSED");
      expect(repository.updateRmaStatus).toHaveBeenCalledWith(
        "rma-123",
        "CLOSED",
      );
    });

    it("should close a RECEIVED RMA", async () => {
      const receivedRma = { ...mockRma, status: "RECEIVED" };
      const closedRma = { ...mockRma, status: "CLOSED" };
      repository.findRmaById.mockResolvedValue(receivedRma);
      repository.updateRmaStatus.mockResolvedValue(closedRma);

      const result = await service.closeRma("rma-123");

      expect(result.status).toBe("CLOSED");
    });

    it("should throw BadRequestException for OPEN RMA", async () => {
      repository.findRmaById.mockResolvedValue(mockRma); // OPEN

      await expect(service.closeRma("rma-123")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("cancelRma", () => {
    it("should cancel an OPEN RMA", async () => {
      const cancelledRma = { ...mockRma, status: "CANCELLED" };
      repository.findRmaById.mockResolvedValue(mockRma);
      repository.updateRmaStatus.mockResolvedValue(cancelledRma);

      const result = await service.cancelRma("rma-123", "No longer needed");

      expect(result.status).toBe("CANCELLED");
    });

    it("should throw BadRequestException for CLOSED RMA", async () => {
      const closedRma = { ...mockRma, status: "CLOSED" };
      repository.findRmaById.mockResolvedValue(closedRma);

      await expect(
        service.cancelRma("rma-123", "reason"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for already CANCELLED RMA", async () => {
      const cancelledRma = { ...mockRma, status: "CANCELLED" };
      repository.findRmaById.mockResolvedValue(cancelledRma);

      await expect(
        service.cancelRma("rma-123", "reason"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --- Receiving ---

  describe("receiveRmaLine", () => {
    it("should receive line and record stock movement", async () => {
      const receivedLine = { ...mockRmaLine, qtyReceived: 5 };
      repository.findRmaById.mockResolvedValue({
        ...mockRma,
        status: "AWAITING_RETURN",
      });
      repository.findRmaLineById.mockResolvedValue(mockRmaLine);
      stockLedger.recordMovement.mockResolvedValue("movement-id");
      repository.receiveRmaLine.mockResolvedValue(receivedLine);
      repository.getRmaLines.mockResolvedValue([receivedLine]);
      repository.updateRmaStatus.mockResolvedValue({
        ...mockRma,
        status: "RECEIVED",
      });

      const result = await service.receiveRmaLine(
        "rma-123",
        "line-123",
        5,
        "bin-recv",
        "user-123",
      );

      expect(result.qtyReceived).toBe(5);
      expect(stockLedger.recordMovement).toHaveBeenCalledWith({
        tenantId: "tenant-123",
        siteId: "site-123",
        itemId: "item-123",
        toBinId: "bin-recv",
        qty: 5,
        reason: "RETURN",
        refType: "rma",
        refId: "rma-123",
        createdBy: "user-123",
      });
    });

    it("should update RMA status to RECEIVED when all lines received", async () => {
      const receivedLine = { ...mockRmaLine, qtyReceived: 5 };
      repository.findRmaById.mockResolvedValue({
        ...mockRma,
        status: "AWAITING_RETURN",
      });
      repository.findRmaLineById.mockResolvedValue(mockRmaLine);
      stockLedger.recordMovement.mockResolvedValue("movement-id");
      repository.receiveRmaLine.mockResolvedValue(receivedLine);
      repository.getRmaLines.mockResolvedValue([receivedLine]);
      repository.updateRmaStatus.mockResolvedValue({
        ...mockRma,
        status: "RECEIVED",
      });

      await service.receiveRmaLine("rma-123", "line-123", 5, "bin-recv");

      expect(repository.updateRmaStatus).toHaveBeenCalledWith(
        "rma-123",
        "RECEIVED",
      );
    });

    it("should throw NotFoundException when line not found", async () => {
      repository.findRmaById.mockResolvedValue(mockRma);
      repository.findRmaLineById.mockResolvedValue(null);

      await expect(
        service.receiveRmaLine("rma-123", "missing", 5, "bin-recv"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when line belongs to different RMA", async () => {
      const wrongLine = { ...mockRmaLine, rmaId: "other-rma" };
      repository.findRmaById.mockResolvedValue(mockRma);
      repository.findRmaLineById.mockResolvedValue(wrongLine);

      await expect(
        service.receiveRmaLine("rma-123", "line-123", 5, "bin-recv"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- Disposition ---

  describe("setLineDisposition", () => {
    it("should set disposition and move stock", async () => {
      const receivedLine = { ...mockRmaLine, qtyReceived: 5 };
      const disposedLine = {
        ...receivedLine,
        disposition: "RESTOCK",
        dispositionBinId: "bin-good",
      };
      repository.findRmaById.mockResolvedValue(mockRma);
      repository.findRmaLineById.mockResolvedValue(receivedLine);
      stockLedger.recordMovement.mockResolvedValue("movement-id");
      repository.setLineDisposition.mockResolvedValue(disposedLine);
      repository.getRmaLines.mockResolvedValue([disposedLine]);
      repository.updateRmaStatus.mockResolvedValue({
        ...mockRma,
        status: "DISPOSITION_COMPLETE",
      });

      const result = await service.setLineDisposition(
        "rma-123",
        "line-123",
        "RESTOCK",
        "bin-good",
        "inspector-1",
        "Looks good",
      );

      expect(result.disposition).toBe("RESTOCK");
      expect(stockLedger.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: "TRANSFER",
          toBinId: "bin-good",
        }),
      );
    });

    it("should use SCRAP reason for scrap disposition", async () => {
      const receivedLine = { ...mockRmaLine, qtyReceived: 5 };
      repository.findRmaById.mockResolvedValue(mockRma);
      repository.findRmaLineById.mockResolvedValue(receivedLine);
      stockLedger.recordMovement.mockResolvedValue("movement-id");
      repository.setLineDisposition.mockResolvedValue({
        ...receivedLine,
        disposition: "SCRAP",
      });
      repository.getRmaLines.mockResolvedValue([
        { ...receivedLine, disposition: "SCRAP" },
      ]);
      repository.updateRmaStatus.mockResolvedValue(mockRma);

      await service.setLineDisposition(
        "rma-123",
        "line-123",
        "SCRAP",
        "bin-scrap",
        "inspector-1",
      );

      expect(stockLedger.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "SCRAP" }),
      );
    });

    it("should throw BadRequestException when line not received", async () => {
      repository.findRmaById.mockResolvedValue(mockRma);
      repository.findRmaLineById.mockResolvedValue(mockRmaLine); // qtyReceived: 0

      await expect(
        service.setLineDisposition(
          "rma-123",
          "line-123",
          "RESTOCK",
          "bin-good",
          "inspector-1",
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.setLineDisposition(
          "rma-123",
          "line-123",
          "RESTOCK",
          "bin-good",
          "inspector-1",
        ),
      ).rejects.toThrow("Line must be received before disposition");
    });
  });

  // --- Credit Notes ---

  describe("createCreditNote", () => {
    it("should create credit note with calculated totals", async () => {
      const receivedLine = {
        ...mockRmaLine,
        qtyReceived: 5,
        unitCreditAmount: 10.0,
      };
      repository.findRmaById.mockResolvedValue(mockRma);
      repository.getRmaLines.mockResolvedValue([receivedLine]);
      repository.generateCreditNo.mockResolvedValue("CN-000001");
      repository.createCreditNoteDraft.mockResolvedValue(mockCreditNote);
      repository.updateRmaStatus.mockResolvedValue(mockRma);

      const result = await service.createCreditNote("rma-123", "user-123");

      expect(result).toEqual(mockCreditNote);
      expect(repository.createCreditNoteDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "tenant-123",
          rmaId: "rma-123",
          creditNo: "CN-000001",
          subtotal: 50, // 5 * 10
          taxAmount: 7.5, // 50 * 0.15
          totalAmount: 57.5,
        }),
      );
      expect(repository.updateRmaStatus).toHaveBeenCalledWith(
        "rma-123",
        "CREDIT_PENDING",
      );
    });
  });

  describe("deleteCreditNote", () => {
    it("should delete a DRAFT credit note", async () => {
      repository.findCreditNoteById.mockResolvedValue(mockCreditNote);
      repository.deleteCreditNote.mockResolvedValue(true);

      await service.deleteCreditNote("cn-123");

      expect(repository.deleteCreditNote).toHaveBeenCalledWith("cn-123");
    });

    it("should throw NotFoundException when credit note not found", async () => {
      repository.findCreditNoteById.mockResolvedValue(null);

      await expect(service.deleteCreditNote("missing")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException for non-DRAFT credit note", async () => {
      const approved = { ...mockCreditNote, status: "APPROVED" };
      repository.findCreditNoteById.mockResolvedValue(approved);

      await expect(service.deleteCreditNote("cn-123")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteCreditNote("cn-123")).rejects.toThrow(
        "Only DRAFT credit notes can be deleted",
      );
    });
  });

  describe("approveCreditNote", () => {
    it("should approve credit note and update RMA status", async () => {
      const approved = {
        ...mockCreditNote,
        rmaId: "rma-123",
        status: "APPROVED",
      };
      repository.approveCreditNote.mockResolvedValue(approved);
      repository.updateRmaStatus.mockResolvedValue(mockRma);

      const result = await service.approveCreditNote("cn-123", "approver-1");

      expect(result.status).toBe("APPROVED");
      expect(repository.approveCreditNote).toHaveBeenCalledWith(
        "cn-123",
        "approver-1",
      );
      expect(repository.updateRmaStatus).toHaveBeenCalledWith(
        "rma-123",
        "CREDIT_APPROVED",
      );
    });

    it("should throw BadRequestException when not in SUBMITTED status", async () => {
      repository.approveCreditNote.mockResolvedValue(null);

      await expect(
        service.approveCreditNote("cn-123", "approver-1"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.approveCreditNote("cn-123", "approver-1"),
      ).rejects.toThrow(
        "Credit note not found or not in SUBMITTED status",
      );
    });
  });

  describe("completeDisposition", () => {
    it("should complete disposition when all lines disposed", async () => {
      const disposedLine = { ...mockRmaLine, disposition: "RESTOCK" };
      const dispositionedRma = { ...mockRma, status: "DISPOSITIONED" };
      repository.findRmaById.mockResolvedValue(mockRma);
      repository.getRmaLines.mockResolvedValue([disposedLine]);
      repository.updateRmaStatus.mockResolvedValue(dispositionedRma);

      const result = await service.completeDisposition("rma-123");

      expect(result.status).toBe("DISPOSITIONED");
    });

    it("should throw BadRequestException when no lines", async () => {
      repository.findRmaById.mockResolvedValue(mockRma);
      repository.getRmaLines.mockResolvedValue([]);

      await expect(
        service.completeDisposition("rma-123"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.completeDisposition("rma-123"),
      ).rejects.toThrow("RMA has no lines");
    });

    it("should throw BadRequestException when lines not all disposed", async () => {
      repository.findRmaById.mockResolvedValue(mockRma);
      repository.getRmaLines.mockResolvedValue([mockRmaLine]); // disposition: PENDING

      await expect(
        service.completeDisposition("rma-123"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.completeDisposition("rma-123"),
      ).rejects.toThrow(
        "All lines must have a disposition set before completing",
      );
    });
  });
});
