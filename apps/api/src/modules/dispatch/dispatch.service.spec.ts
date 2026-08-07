import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { DispatchService } from "./dispatch.service";
import {
  DispatchRepository,
  DispatchTrip,
  DispatchStop,
  Pod,
} from "./dispatch.repository";
import { AuditService } from "../audit/audit.service";
import { FulfilmentService } from "../fulfilment/fulfilment.service";

describe("DispatchService", () => {
  let service: DispatchService;
  let repository: jest.Mocked<DispatchRepository>;
  let auditService: jest.Mocked<AuditService>;
  let fulfilmentService: jest.Mocked<FulfilmentService>;

  const mockTrip: DispatchTrip = {
    id: "trip-123",
    tenantId: "tenant-123",
    siteId: "site-123",
    warehouseId: "warehouse-123",
    tripNo: "TRIP-000001",
    status: "PLANNED",
    vehicleId: null,
    driverId: null,
    driverName: null,
    vehiclePlate: null,
    plannedDate: new Date(),
    plannedStart: null,
    actualStart: null,
    actualEnd: null,
    totalWeightKg: 0,
    totalCbm: 0,
    totalStops: 0,
    notes: null,
    createdBy: "user-123",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStop: DispatchStop = {
    id: "stop-123",
    tenantId: "tenant-123",
    tripId: "trip-123",
    sequence: 1,
    customerId: "customer-123",
    customerName: "Test Customer",
    shipmentId: "shipment-123",
    shipmentNo: "SHP-001",
    orderNo: "SO-000001",
    addressLine1: "123 Main St",
    city: "Cape Town",
    gpsLat: null,
    gpsLng: null,
    status: "PENDING",
    notes: null,
    failureReason: null,
    eta: null,
    arrivedAt: null,
    completedAt: null,
    createdAt: new Date(),
  };

  const mockPod: Pod = {
    id: "pod-123",
    tenantId: "tenant-123",
    stopId: "stop-123",
    status: "DELIVERED",
    recipientName: "John Doe",
    signatureRef: "sig-ref",
    photoRefs: [],
    gpsLat: null,
    gpsLng: null,
    notes: null,
    failureReason: null,
    capturedBy: "user-123",
    capturedAt: new Date(),
    syncedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchService,
        {
          provide: DispatchRepository,
          useValue: {
            generateTripNo: jest.fn(),
            createTrip: jest.fn(),
            findTripById: jest.fn(),
            findTripsByTenant: jest.fn(),
            countTripsByTenant: jest.fn(),
            updateTripStatus: jest.fn(),
            assignDriver: jest.fn(),
            assignTripManual: jest.fn(),
            cancelTrip: jest.fn(),
            addStop: jest.fn(),
            addStopFromShipment: jest.fn(),
            findStopsByTrip: jest.fn(),
            findStopById: jest.fn(),
            updateStopStatus: jest.fn(),
            updateStopWithFailure: jest.fn(),
            updateTripStopCount: jest.fn(),
            updateTripCompletedStops: jest.fn(),
            createPod: jest.fn(),
            findPodByStop: jest.fn(),
            findDriverTrips: jest.fn(),
            findVehicles: jest.fn(),
            findDrivers: jest.fn(),
            getShipmentInfoForTrip: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: FulfilmentService,
          useValue: {
            shipShipment: jest.fn(),
            deliverShipment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DispatchService>(DispatchService);
    repository = module.get(DispatchRepository);
    auditService = module.get(AuditService);
    fulfilmentService = module.get(FulfilmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- Trip CRUD ---

  describe("createTrip", () => {
    it("should create a trip with generated trip number", async () => {
      repository.generateTripNo.mockResolvedValue("TRIP-000001");
      repository.createTrip.mockResolvedValue(mockTrip);

      const result = await service.createTrip({
        tenantId: "tenant-123",
        siteId: "site-123",
        warehouseId: "warehouse-123",
      });

      expect(result).toEqual(mockTrip);
      expect(repository.generateTripNo).toHaveBeenCalledWith("tenant-123");
      expect(repository.createTrip).toHaveBeenCalledWith({
        tenantId: "tenant-123",
        siteId: "site-123",
        warehouseId: "warehouse-123",
        tripNo: "TRIP-000001",
      });
    });
  });

  describe("getTrip", () => {
    it("should return trip when found", async () => {
      repository.findTripById.mockResolvedValue(mockTrip);

      const result = await service.getTrip("trip-123");

      expect(result).toEqual(mockTrip);
      expect(repository.findTripById).toHaveBeenCalledWith("trip-123");
    });

    it("should throw NotFoundException when trip not found", async () => {
      repository.findTripById.mockResolvedValue(null);

      await expect(service.getTrip("missing")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getTrip("missing")).rejects.toThrow(
        "Trip not found",
      );
    });
  });

  describe("getTripWithStops", () => {
    it("should return trip with its stops", async () => {
      repository.findTripById.mockResolvedValue(mockTrip);
      repository.findStopsByTrip.mockResolvedValue([mockStop]);

      const result = await service.getTripWithStops("trip-123");

      expect(result.trip).toEqual(mockTrip);
      expect(result.stops).toEqual([mockStop]);
    });
  });

  describe("listTrips", () => {
    it("should return paginated trips", async () => {
      repository.findTripsByTenant.mockResolvedValue([mockTrip]);
      repository.countTripsByTenant.mockResolvedValue(1);

      const result = await service.listTrips("tenant-123", {}, 1, 10);

      expect(result.data).toEqual([mockTrip]);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(repository.findTripsByTenant).toHaveBeenCalledWith(
        "tenant-123",
        { sinceDate: expect.any(Date) },
        10,
        0,
      );
    });

    it("should default to a 30-day sinceDate cutoff when showAll is not set", async () => {
      repository.findTripsByTenant.mockResolvedValue([mockTrip]);
      repository.countTripsByTenant.mockResolvedValue(1);

      await service.listTrips("tenant-123", {}, 1, 10);

      const [, filters] = repository.findTripsByTenant.mock.calls[0];
      const expectedCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      expect(filters.sinceDate).toBeInstanceOf(Date);
      expect(
        Math.abs(filters.sinceDate!.getTime() - expectedCutoff),
      ).toBeLessThan(5000);

      const [, countFilters] = repository.countTripsByTenant.mock.calls[0];
      expect(countFilters.sinceDate).toEqual(filters.sinceDate);
    });

    it("should pass a null sinceDate when showAll is true", async () => {
      repository.findTripsByTenant.mockResolvedValue([mockTrip]);
      repository.countTripsByTenant.mockResolvedValue(1);

      await service.listTrips("tenant-123", { showAll: true }, 1, 10);

      expect(repository.findTripsByTenant).toHaveBeenCalledWith(
        "tenant-123",
        { showAll: true, sinceDate: null },
        10,
        0,
      );
      expect(repository.countTripsByTenant).toHaveBeenCalledWith(
        "tenant-123",
        { showAll: true, sinceDate: null },
      );
    });

    it("should preserve other filters alongside sinceDate", async () => {
      repository.findTripsByTenant.mockResolvedValue([mockTrip]);
      repository.countTripsByTenant.mockResolvedValue(1);

      await service.listTrips(
        "tenant-123",
        { status: "PLANNED", search: "abc" },
        2,
        20,
      );

      expect(repository.findTripsByTenant).toHaveBeenCalledWith(
        "tenant-123",
        { status: "PLANNED", search: "abc", sinceDate: expect.any(Date) },
        20,
        20,
      );
    });
  });

  // --- Driver assignment ---

  describe("assignDriver", () => {
    it("should assign driver to trip", async () => {
      const assignedTrip = {
        ...mockTrip,
        driverId: "driver-1",
        status: "ASSIGNED",
      };
      repository.assignDriver.mockResolvedValue(assignedTrip);

      const result = await service.assignDriver("trip-123", "driver-1");

      expect(result.driverId).toBe("driver-1");
      expect(repository.assignDriver).toHaveBeenCalledWith(
        "trip-123",
        "driver-1",
        undefined,
      );
    });

    it("should assign driver with vehicle", async () => {
      const assignedTrip = {
        ...mockTrip,
        driverId: "driver-1",
        vehicleId: "vehicle-1",
      };
      repository.assignDriver.mockResolvedValue(assignedTrip);

      const result = await service.assignDriver(
        "trip-123",
        "driver-1",
        "vehicle-1",
      );

      expect(repository.assignDriver).toHaveBeenCalledWith(
        "trip-123",
        "driver-1",
        "vehicle-1",
      );
    });

    it("should throw NotFoundException when trip not found", async () => {
      repository.assignDriver.mockResolvedValue(null);

      await expect(service.assignDriver("missing", "driver-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("assignTrip", () => {
    it("should assign vehicle and driver to trip", async () => {
      const assignedTrip = {
        ...mockTrip,
        driverId: "driver-1",
        status: "ASSIGNED",
      };
      repository.assignTripManual.mockResolvedValue(assignedTrip);

      const result = await service.assignTrip("trip-123", {
        driverId: "driver-1",
        vehicleId: "vehicle-1",
      });

      expect(result.status).toBe("ASSIGNED");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: "Trip", action: "ASSIGN" }),
      );
    });

    it("should throw BadRequestException when no driver is provided", async () => {
      await expect(
        service.assignTrip("trip-123", { vehicleId: "vehicle-1" }),
      ).rejects.toThrow("A driver must be assigned to the trip");
      expect(repository.assignTripManual).not.toHaveBeenCalled();
    });
  });

  // --- Trip lifecycle ---

  describe("startTrip", () => {
    it("should start an assigned trip", async () => {
      const assignedTrip = {
        ...mockTrip,
        status: "ASSIGNED",
        driverId: "driver-1",
      };
      const inProgressTrip = { ...assignedTrip, status: "IN_PROGRESS" };
      repository.findTripById.mockResolvedValue(assignedTrip);
      repository.findStopsByTrip.mockResolvedValue([]);
      repository.updateTripStatus.mockResolvedValue(inProgressTrip);

      const result = await service.startTrip("trip-123");

      expect(result.status).toBe("IN_PROGRESS");
      expect(repository.updateTripStatus).toHaveBeenCalledWith(
        "trip-123",
        "IN_PROGRESS",
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: "Trip", action: "START" }),
      );
    });

    it("should ship every stop's shipment, cascading to the sales order", async () => {
      const assignedTrip = {
        ...mockTrip,
        status: "ASSIGNED",
        driverId: "driver-1",
        driverName: "Jane Driver",
        tripNo: "TRIP-000001",
      };
      const inProgressTrip = { ...assignedTrip, status: "IN_PROGRESS" };
      repository.findTripById.mockResolvedValue(assignedTrip);
      repository.findStopsByTrip.mockResolvedValue([mockStop]);
      repository.updateTripStatus.mockResolvedValue(inProgressTrip);
      fulfilmentService.shipShipment.mockResolvedValue(undefined as never);

      await service.startTrip("trip-123");

      expect(fulfilmentService.shipShipment).toHaveBeenCalledWith(
        mockStop.shipmentId,
        { carrier: "Jane Driver", trackingNo: "TRIP-000001" },
      );
    });

    it("should not block starting the trip when a shipment fails to cascade", async () => {
      const assignedTrip = {
        ...mockTrip,
        status: "ASSIGNED",
        driverId: "driver-1",
      };
      const inProgressTrip = { ...assignedTrip, status: "IN_PROGRESS" };
      repository.findTripById.mockResolvedValue(assignedTrip);
      repository.findStopsByTrip.mockResolvedValue([mockStop]);
      repository.updateTripStatus.mockResolvedValue(inProgressTrip);
      fulfilmentService.shipShipment.mockRejectedValue(
        new BadRequestException("Cannot ship: batch not cleared for dispatch"),
      );

      const result = await service.startTrip("trip-123");

      expect(result.status).toBe("IN_PROGRESS");
      expect(repository.updateTripStatus).toHaveBeenCalledWith(
        "trip-123",
        "IN_PROGRESS",
      );
    });

    it("should skip stops with no shipment attached", async () => {
      const assignedTrip = {
        ...mockTrip,
        status: "ASSIGNED",
        driverId: "driver-1",
      };
      const inProgressTrip = { ...assignedTrip, status: "IN_PROGRESS" };
      repository.findTripById.mockResolvedValue(assignedTrip);
      repository.findStopsByTrip.mockResolvedValue([
        { ...mockStop, shipmentId: null },
      ]);
      repository.updateTripStatus.mockResolvedValue(inProgressTrip);

      await service.startTrip("trip-123");

      expect(fulfilmentService.shipShipment).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when trip is not assigned", async () => {
      repository.findTripById.mockResolvedValue(mockTrip); // PLANNED status

      await expect(service.startTrip("trip-123")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.startTrip("trip-123")).rejects.toThrow(
        "Trip must be assigned before starting",
      );
    });

    it("should throw BadRequestException when trip has no driver assigned", async () => {
      const assignedTrip = { ...mockTrip, status: "ASSIGNED", driverId: null };
      repository.findTripById.mockResolvedValue(assignedTrip);

      await expect(service.startTrip("trip-123")).rejects.toThrow(
        "Trip must have a driver assigned before starting",
      );
      expect(repository.updateTripStatus).not.toHaveBeenCalled();
    });
  });

  describe("completeTrip", () => {
    it("should complete an in-progress trip with all stops done", async () => {
      const inProgressTrip = { ...mockTrip, status: "IN_PROGRESS" };
      const completedTrip = { ...mockTrip, status: "COMPLETE" };
      const deliveredStop = { ...mockStop, status: "DELIVERED" };
      repository.findTripById.mockResolvedValue(inProgressTrip);
      repository.findStopsByTrip.mockResolvedValue([deliveredStop]);
      repository.updateTripStatus.mockResolvedValue(completedTrip);

      const result = await service.completeTrip("trip-123");

      expect(result.status).toBe("COMPLETE");
      expect(repository.updateTripCompletedStops).toHaveBeenCalledWith(
        "trip-123",
        1,
      );
    });

    it("should throw BadRequestException with pending stops", async () => {
      const inProgressTrip = { ...mockTrip, status: "IN_PROGRESS" };
      repository.findTripById.mockResolvedValue(inProgressTrip);
      repository.findStopsByTrip.mockResolvedValue([mockStop]); // PENDING

      await expect(service.completeTrip("trip-123")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should force complete and skip pending stops", async () => {
      const inProgressTrip = { ...mockTrip, status: "IN_PROGRESS" };
      const completedTrip = { ...mockTrip, status: "COMPLETE" };
      repository.findTripById.mockResolvedValue(inProgressTrip);
      repository.findStopsByTrip.mockResolvedValue([mockStop]); // PENDING
      repository.updateStopStatus.mockResolvedValue({
        ...mockStop,
        status: "SKIPPED",
      });
      repository.updateTripStatus.mockResolvedValue(completedTrip);

      const result = await service.completeTrip("trip-123", true);

      expect(result.status).toBe("COMPLETE");
      expect(repository.updateStopStatus).toHaveBeenCalledWith(
        "stop-123",
        "SKIPPED",
      );
      // The only stop was force-skipped (not delivered), so the completed-stops
      // counter must reflect 0 delivered -- not be left stale from before.
      expect(repository.updateTripCompletedStops).toHaveBeenCalledWith(
        "trip-123",
        0,
      );
    });

    it("should throw BadRequestException when trip is not in progress", async () => {
      repository.findTripById.mockResolvedValue(mockTrip); // PLANNED

      await expect(service.completeTrip("trip-123")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.completeTrip("trip-123")).rejects.toThrow(
        "Trip must be in progress to complete",
      );
    });
  });

  describe("cancelTrip", () => {
    it("should cancel a planned trip", async () => {
      const cancelledTrip = { ...mockTrip, status: "CANCELLED" };
      repository.findTripById.mockResolvedValue(mockTrip);
      repository.cancelTrip.mockResolvedValue(cancelledTrip);

      const result = await service.cancelTrip("trip-123", "No longer needed");

      expect(result.status).toBe("CANCELLED");
      expect(repository.cancelTrip).toHaveBeenCalledWith(
        "trip-123",
        "No longer needed",
      );
    });

    it("should throw BadRequestException for completed trip", async () => {
      const completedTrip = { ...mockTrip, status: "COMPLETE" };
      repository.findTripById.mockResolvedValue(completedTrip);

      await expect(service.cancelTrip("trip-123", "reason")).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.cancelTrip("trip-123", "reason")).rejects.toThrow(
        "Cannot cancel a completed or already cancelled trip",
      );
    });

    it("should throw BadRequestException for already cancelled trip", async () => {
      const cancelledTrip = { ...mockTrip, status: "CANCELLED" };
      repository.findTripById.mockResolvedValue(cancelledTrip);

      await expect(service.cancelTrip("trip-123", "reason")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // --- Stop operations ---

  describe("arriveAtStop", () => {
    it("should mark stop as arrived", async () => {
      const inProgressTrip = { ...mockTrip, status: "IN_PROGRESS" };
      const arrivedStop = { ...mockStop, status: "ARRIVED" };
      repository.findTripById.mockResolvedValue(inProgressTrip);
      repository.findStopById.mockResolvedValue(mockStop);
      repository.updateStopStatus.mockResolvedValue(arrivedStop);

      const result = await service.arriveAtStop("trip-123", "stop-123");

      expect(result.status).toBe("ARRIVED");
    });

    it("should throw when trip is not in progress", async () => {
      repository.findTripById.mockResolvedValue(mockTrip); // PLANNED

      await expect(
        service.arriveAtStop("trip-123", "stop-123"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw when stop not found", async () => {
      const inProgressTrip = { ...mockTrip, status: "IN_PROGRESS" };
      repository.findTripById.mockResolvedValue(inProgressTrip);
      repository.findStopById.mockResolvedValue(null);

      await expect(service.arriveAtStop("trip-123", "missing")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw when stop does not belong to trip", async () => {
      const inProgressTrip = { ...mockTrip, status: "IN_PROGRESS" };
      const wrongStop = { ...mockStop, tripId: "other-trip" };
      repository.findTripById.mockResolvedValue(inProgressTrip);
      repository.findStopById.mockResolvedValue(wrongStop);

      await expect(
        service.arriveAtStop("trip-123", "stop-123"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.arriveAtStop("trip-123", "stop-123"),
      ).rejects.toThrow("Stop does not belong to this trip");
    });
  });

  describe("completeStopWithPod", () => {
    const inProgressTrip = { ...mockTrip, status: "IN_PROGRESS" };

    it("should deliver the stop's shipment, cascading to the sales order", async () => {
      repository.findTripById.mockResolvedValue(inProgressTrip);
      repository.findStopById.mockResolvedValue(mockStop);
      repository.updateStopStatus.mockResolvedValue({
        ...mockStop,
        status: "DELIVERED",
      });
      repository.findStopsByTrip.mockResolvedValue([
        { ...mockStop, status: "DELIVERED" },
      ]);
      fulfilmentService.deliverShipment.mockResolvedValue(undefined as never);

      const result = await service.completeStopWithPod(
        "trip-123",
        "stop-123",
        "tenant-123",
        {},
      );

      expect(result.status).toBe("DELIVERED");
      expect(fulfilmentService.deliverShipment).toHaveBeenCalledWith(
        mockStop.shipmentId,
      );
      expect(repository.updateTripCompletedStops).toHaveBeenCalledWith(
        "trip-123",
        1,
      );
    });

    it("should not block the stop completing when the shipment fails to cascade", async () => {
      repository.findTripById.mockResolvedValue(inProgressTrip);
      repository.findStopById.mockResolvedValue(mockStop);
      repository.updateStopStatus.mockResolvedValue({
        ...mockStop,
        status: "DELIVERED",
      });
      repository.findStopsByTrip.mockResolvedValue([mockStop]);
      fulfilmentService.deliverShipment.mockRejectedValue(
        new BadRequestException("Shipment must be shipped before delivery"),
      );

      const result = await service.completeStopWithPod(
        "trip-123",
        "stop-123",
        "tenant-123",
        {},
      );

      expect(result.status).toBe("DELIVERED");
    });

    it("should skip the cascade when the stop has no shipment attached", async () => {
      const stopWithoutShipment = { ...mockStop, shipmentId: null };
      repository.findTripById.mockResolvedValue(inProgressTrip);
      repository.findStopById.mockResolvedValue(stopWithoutShipment);
      repository.updateStopStatus.mockResolvedValue({
        ...stopWithoutShipment,
        status: "DELIVERED",
      });
      repository.findStopsByTrip.mockResolvedValue([stopWithoutShipment]);

      await service.completeStopWithPod("trip-123", "stop-123", "tenant-123", {});

      expect(fulfilmentService.deliverShipment).not.toHaveBeenCalled();
    });

    it("should throw when the trip is not in progress", async () => {
      repository.findTripById.mockResolvedValue(mockTrip); // PLANNED

      await expect(
        service.completeStopWithPod("trip-123", "stop-123", "tenant-123", {}),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw when the stop is already delivered", async () => {
      repository.findTripById.mockResolvedValue(inProgressTrip);
      repository.findStopById.mockResolvedValue({
        ...mockStop,
        status: "DELIVERED",
      });

      await expect(
        service.completeStopWithPod("trip-123", "stop-123", "tenant-123", {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("updateStopStatus", () => {
    it("should update stop status", async () => {
      const updatedStop = { ...mockStop, status: "DELIVERED" };
      repository.findStopById.mockResolvedValue(mockStop);
      repository.updateStopStatus.mockResolvedValue(updatedStop);

      const result = await service.updateStopStatus("stop-123", "DELIVERED");

      expect(result.status).toBe("DELIVERED");
    });

    it("should throw NotFoundException when stop not found", async () => {
      repository.findStopById.mockResolvedValue(null);

      await expect(
        service.updateStopStatus("missing", "DELIVERED"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- POD ---

  describe("capturesPod", () => {
    it("should create POD and update stop status", async () => {
      repository.findStopById.mockResolvedValue(mockStop);
      repository.createPod.mockResolvedValue(mockPod);
      repository.updateStopStatus.mockResolvedValue({
        ...mockStop,
        status: "DELIVERED",
      });

      const result = await service.capturesPod({
        tenantId: "tenant-123",
        stopId: "stop-123",
        status: "DELIVERED",
        recipientName: "John Doe",
      });

      expect(result).toEqual(mockPod);
      expect(repository.createPod).toHaveBeenCalled();
      expect(repository.updateStopStatus).toHaveBeenCalledWith(
        "stop-123",
        "DELIVERED",
      );
    });

    it("should throw NotFoundException when stop not found", async () => {
      repository.findStopById.mockResolvedValue(null);

      await expect(
        service.capturesPod({
          tenantId: "tenant-123",
          stopId: "missing",
          status: "DELIVERED",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getPod", () => {
    it("should return POD for stop", async () => {
      repository.findPodByStop.mockResolvedValue(mockPod);

      const result = await service.getPod("stop-123");

      expect(result).toEqual(mockPod);
    });

    it("should return null when no POD exists", async () => {
      repository.findPodByStop.mockResolvedValue(null);

      const result = await service.getPod("stop-123");

      expect(result).toBeNull();
    });
  });
});
