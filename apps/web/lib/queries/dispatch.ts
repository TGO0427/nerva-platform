import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResult, TripStatus, StopStatus } from '@nerva/shared';
import type { QueryParams } from './use-query-params';

const TRIPS_KEY = 'dispatch-trips';

// Types
export interface Trip {
  id: string;
  tenantId: string;
  tripNo: string;
  status: TripStatus;
  vehicleId: string | null;
  vehiclePlate?: string;
  driverId: string | null;
  driverName?: string;
  plannedDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalStops: number;
  completedStops: number;
  totalWeight: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripStop {
  id: string;
  tripId: string;
  sequence: number;
  shipmentId: string | null;
  shipmentNo?: string;
  customerId: string | null;
  customerName?: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  status: StopStatus;
  arrivedAt: string | null;
  departedAt: string | null;
  podSignature: string | null;
  podPhoto: string | null;
  podNotes: string | null;
  failureReason: string | null;
}

export interface Vehicle {
  id: string;
  tenantId: string;
  plateNo: string;
  type: string;
  capacityKg: number;
  capacityCbm: number;
  isActive: boolean;
}

export interface Driver {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  licenseNo: string;
  phone: string | null;
  isActive: boolean;
}

// Trip queries
export function useTrips(params: QueryParams & { status?: TripStatus; date?: string }) {
  return useQuery({
    queryKey: [TRIPS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);
      if (params.date) searchParams.set('date', params.date);

      const response = await api.get<PaginatedResult<Trip>>(
        `/dispatch/trips?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useTrip(id: string | undefined) {
  return useQuery({
    queryKey: [TRIPS_KEY, id],
    queryFn: async () => {
      const response = await api.get<Trip>(`/dispatch/trips/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useTripStops(tripId: string | undefined) {
  return useQuery({
    queryKey: [TRIPS_KEY, tripId, 'stops'],
    queryFn: async () => {
      const response = await api.get<TripStop[]>(`/dispatch/trips/${tripId}/stops`);
      return response.data;
    },
    enabled: !!tripId,
  });
}

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const response = await api.get<Vehicle[]>('/dispatch/vehicles');
      return response.data;
    },
  });
}

export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const response = await api.get<Driver[]>('/dispatch/drivers');
      return response.data;
    },
  });
}

// Trip mutations
export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      plannedDate?: string;
      vehicleId?: string;
      driverId?: string;
      notes?: string;
      shipmentIds: string[];
    }) => {
      const response = await api.post<Trip>('/dispatch/trips', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY] });
    },
  });
}

export function useAssignTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, vehicleId, driverId }: { tripId: string; vehicleId: string; driverId: string }) => {
      const response = await api.post<Trip>(`/dispatch/trips/${tripId}/assign`, {
        vehicleId,
        driverId,
      });
      return response.data;
    },
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY] });
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY, tripId] });
    },
  });
}

export function useStartTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const response = await api.post<Trip>(`/dispatch/trips/${tripId}/start`);
      return response.data;
    },
    onSuccess: (_, tripId) => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY] });
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY, tripId] });
    },
  });
}

export function useCompleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const response = await api.post<Trip>(`/dispatch/trips/${tripId}/complete`);
      return response.data;
    },
    onSuccess: (_, tripId) => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY] });
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY, tripId] });
    },
  });
}

export function useCancelTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, reason }: { tripId: string; reason: string }) => {
      const response = await api.post<Trip>(`/dispatch/trips/${tripId}/cancel`, { reason });
      return response.data;
    },
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY] });
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY, tripId] });
    },
  });
}

// Stop mutations
export function useArriveAtStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, stopId }: { tripId: string; stopId: string }) => {
      const response = await api.post<TripStop>(`/dispatch/trips/${tripId}/stops/${stopId}/arrive`);
      return response.data;
    },
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY, tripId, 'stops'] });
    },
  });
}

export function useCompleteStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tripId,
      stopId,
      podSignature,
      podPhoto,
      podNotes,
    }: {
      tripId: string;
      stopId: string;
      podSignature?: string;
      podPhoto?: string;
      podNotes?: string;
    }) => {
      const response = await api.post<TripStop>(`/dispatch/trips/${tripId}/stops/${stopId}/complete`, {
        podSignature,
        podPhoto,
        podNotes,
      });
      return response.data;
    },
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY, tripId] });
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY, tripId, 'stops'] });
    },
  });
}

export function useFailStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, stopId, reason }: { tripId: string; stopId: string; reason: string }) => {
      const response = await api.post<TripStop>(`/dispatch/trips/${tripId}/stops/${stopId}/fail`, {
        reason,
      });
      return response.data;
    },
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY, tripId] });
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY, tripId, 'stops'] });
    },
  });
}

export function useSkipStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, stopId, reason }: { tripId: string; stopId: string; reason: string }) => {
      const response = await api.post<TripStop>(`/dispatch/trips/${tripId}/stops/${stopId}/skip`, {
        reason,
      });
      return response.data;
    },
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY, tripId] });
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY, tripId, 'stops'] });
    },
  });
}
