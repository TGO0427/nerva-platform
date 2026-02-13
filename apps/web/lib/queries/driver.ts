import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

const DRIVER_KEY = 'driver';

export interface DriverTrip {
  id: string;
  tripNo: string;
  status: string;
  vehicleId: string | null;
  driverId: string | null;
  driverName: string | null;
  vehiclePlate: string | null;
  plannedDate: string | null;
  plannedStart: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  totalStops: number;
  notes: string | null;
  createdAt: string;
}

export interface DriverStop {
  id: string;
  tripId: string;
  sequence: number;
  customerId: string | null;
  customerName: string | null;
  addressLine1: string;
  city: string | null;
  status: string;
  arrivedAt: string | null;
  completedAt: string | null;
}

export interface DriverTripDetail {
  trip: DriverTrip;
  stops: DriverStop[];
}

export interface DriverPod {
  id: string;
  stopId: string;
  status: string;
  recipientName: string | null;
  signatureRef: string | null;
  photoRefs: string[];
  notes: string | null;
  failureReason: string | null;
  capturedAt: string;
}

export function useDriverTrips(status?: string) {
  return useQuery({
    queryKey: [DRIVER_KEY, 'trips', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const response = await api.get<DriverTrip[]>(`/driver/trips${params}`);
      return response.data;
    },
  });
}

export function useDriverTrip(id: string | undefined) {
  return useQuery({
    queryKey: [DRIVER_KEY, 'trips', id],
    queryFn: async () => {
      const response = await api.get<DriverTripDetail>(`/driver/trips/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useDriverStartTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tripId: string) => {
      const response = await api.post<DriverTrip>(`/driver/trips/${tripId}/start`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIVER_KEY, 'trips'] });
    },
  });
}

export function useDriverCompleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tripId: string) => {
      const response = await api.post<DriverTrip>(`/driver/trips/${tripId}/complete`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIVER_KEY, 'trips'] });
    },
  });
}

export function useDriverArriveAtStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stopId: string) => {
      const response = await api.post<any>(`/driver/stops/${stopId}/arrive`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIVER_KEY] });
    },
  });
}

export function useDeliverStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      stopId: string;
      recipientName?: string;
      signatureRef?: string;
      photoRefs?: string[];
      gpsLat?: number;
      gpsLng?: number;
      notes?: string;
    }) => {
      const { stopId, ...body } = data;
      const response = await api.post<any>(`/driver/stops/${stopId}/deliver`, body);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIVER_KEY] });
    },
  });
}

export function useDriverFailStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      stopId: string;
      failureReason: string;
      notes?: string;
      photoRefs?: string[];
      gpsLat?: number;
      gpsLng?: number;
    }) => {
      const { stopId, ...body } = data;
      const response = await api.post<any>(`/driver/stops/${stopId}/fail`, body);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DRIVER_KEY] });
    },
  });
}

export function useStopPod(stopId: string | undefined) {
  return useQuery({
    queryKey: [DRIVER_KEY, 'pod', stopId],
    queryFn: async () => {
      const response = await api.get<DriverPod>(`/driver/stops/${stopId}/pod`);
      return response.data;
    },
    enabled: !!stopId,
  });
}

export function usePresignUpload() {
  return useMutation({
    mutationFn: async (data: { fileName: string; contentType: string; entityType: string }) => {
      const response = await api.post<{ uploadUrl: string; s3Key: string }>('/upload/presign', data);
      return response.data;
    },
  });
}
