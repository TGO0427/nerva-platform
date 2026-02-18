import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { QueryParams } from './use-query-params';

// ============ Types ============

export interface User {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  userType: 'internal' | 'customer' | 'driver';
  customerId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
}

export interface Site {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ Query Keys ============

const USERS_KEY = 'users';
const ROLES_KEY = 'roles';
const PERMISSIONS_KEY = 'permissions';
const SITES_KEY = 'sites';
const TENANT_KEY = 'tenant';

// ============ Users ============

interface CreateUserData {
  email: string;
  password: string;
  displayName: string;
}

interface UpdateUserData {
  displayName?: string;
  isActive?: boolean;
}

export function useUsers(params: QueryParams) {
  return useQuery({
    queryKey: [USERS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));

      const response = await api.get<{ data: User[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(
        `/admin/users?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: [USERS_KEY, id],
    queryFn: async () => {
      const response = await api.get<User>(`/admin/users/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      const response = await api.post<User>('/admin/users', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserData }) => {
      const response = await api.patch<User>(`/admin/users/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, variables.id] });
    },
  });
}

export function useUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: [USERS_KEY, userId, 'roles'],
    queryFn: async () => {
      const response = await api.get<Role[]>(`/admin/users/${userId}/roles`);
      return response.data;
    },
    enabled: !!userId,
  });
}

export function useAssignUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const response = await api.post(`/admin/users/${userId}/roles/${roleId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, variables.userId, 'roles'] });
    },
  });
}

export function useRemoveUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      await api.delete(`/admin/users/${userId}/roles/${roleId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, variables.userId, 'roles'] });
    },
  });
}

export function useUserSites(userId: string | undefined) {
  return useQuery({
    queryKey: [USERS_KEY, userId, 'sites'],
    queryFn: async () => {
      const response = await api.get<Site[]>(`/admin/users/${userId}/sites`);
      return response.data;
    },
    enabled: !!userId,
  });
}

export function useAssignUserSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, siteId }: { userId: string; siteId: string }) => {
      const response = await api.post(`/admin/users/${userId}/sites/${siteId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, variables.userId, 'sites'] });
    },
  });
}

export function useRemoveUserSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, siteId }: { userId: string; siteId: string }) => {
      await api.delete(`/admin/users/${userId}/sites/${siteId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, variables.userId, 'sites'] });
    },
  });
}

interface UserWarehouse {
  id: string;
  name: string;
  code: string;
  siteId: string;
  siteName: string;
  isActive: boolean;
}

export function useUserWarehouses(userId: string | undefined) {
  return useQuery({
    queryKey: [USERS_KEY, userId, 'warehouses'],
    queryFn: async () => {
      const response = await api.get<UserWarehouse[]>(`/admin/users/${userId}/warehouses`);
      return response.data;
    },
    enabled: !!userId,
  });
}

export function useAssignUserWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, warehouseId }: { userId: string; warehouseId: string }) => {
      const response = await api.post(`/admin/users/${userId}/warehouses/${warehouseId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, variables.userId, 'warehouses'] });
    },
  });
}

export function useRemoveUserWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, warehouseId }: { userId: string; warehouseId: string }) => {
      await api.delete(`/admin/users/${userId}/warehouses/${warehouseId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY, variables.userId, 'warehouses'] });
    },
  });
}

// ============ Roles ============

interface CreateRoleData {
  name: string;
  description?: string;
  permissionIds?: string[];
}

interface UpdateRoleData {
  name?: string;
  description?: string;
}

export function useRoles() {
  return useQuery({
    queryKey: [ROLES_KEY],
    queryFn: async () => {
      const response = await api.get<Role[]>('/admin/roles');
      return response.data;
    },
  });
}

export function useRole(id: string | undefined) {
  return useQuery({
    queryKey: [ROLES_KEY, id],
    queryFn: async () => {
      const response = await api.get<Role>(`/admin/roles/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRoleData) => {
      const response = await api.post<Role>('/admin/roles', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_KEY] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRoleData }) => {
      const response = await api.patch<Role>(`/admin/roles/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ROLES_KEY] });
      queryClient.invalidateQueries({ queryKey: [ROLES_KEY, variables.id] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROLES_KEY] });
    },
  });
}

// ============ Permissions ============

export function usePermissions() {
  return useQuery({
    queryKey: [PERMISSIONS_KEY],
    queryFn: async () => {
      const response = await api.get<Permission[]>('/admin/permissions');
      return response.data;
    },
  });
}

export function useRolePermissions(roleId: string | undefined) {
  return useQuery({
    queryKey: [ROLES_KEY, roleId, 'permissions'],
    queryFn: async () => {
      const response = await api.get<Permission[]>(`/admin/roles/${roleId}/permissions`);
      return response.data;
    },
    enabled: !!roleId,
  });
}

export function useSetRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
      const response = await api.post(`/admin/roles/${roleId}/permissions`, { permissionIds });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ROLES_KEY, variables.roleId, 'permissions'] });
    },
  });
}

// ============ Sites ============

interface CreateSiteData {
  name: string;
  code?: string;
}

interface UpdateSiteData {
  name?: string;
  code?: string;
  isActive?: boolean;
}

export function useSites() {
  return useQuery({
    queryKey: [SITES_KEY],
    queryFn: async () => {
      // Use my-sites endpoint to only get sites user is assigned to
      const response = await api.get<Site[]>('/auth/my-sites');
      return response.data;
    },
  });
}

export function useAllSites() {
  return useQuery({
    queryKey: [SITES_KEY, 'all'],
    queryFn: async () => {
      // Admin endpoint to get all sites in tenant
      const response = await api.get<Site[]>('/admin/sites');
      return response.data;
    },
  });
}

export function useSite(id: string | undefined) {
  return useQuery({
    queryKey: [SITES_KEY, id],
    queryFn: async () => {
      const response = await api.get<Site>(`/admin/sites/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSiteData) => {
      const response = await api.post<Site>('/admin/sites', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SITES_KEY] });
    },
  });
}

export function useUpdateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSiteData }) => {
      const response = await api.patch<Site>(`/admin/sites/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SITES_KEY] });
      queryClient.invalidateQueries({ queryKey: [SITES_KEY, variables.id] });
    },
  });
}

// ============ Company Profile ============

export interface TenantProfile {
  name: string;
  code?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  vatNo?: string;
  registrationNo?: string;
  logoUrl?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankBranchCode?: string;
}

const TENANT_PROFILE_KEY = 'tenant-profile';

export function useTenantProfile() {
  return useQuery({
    queryKey: [TENANT_PROFILE_KEY],
    queryFn: async () => {
      const response = await api.get<TenantProfile>('/auth/tenant-profile');
      return response.data;
    },
  });
}

export function useUpdateTenantProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<TenantProfile>) => {
      const response = await api.patch<TenantProfile>('/auth/tenant-profile', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_PROFILE_KEY] });
    },
  });
}

// ============ Tenant Settings ============

interface UpdateTenantData {
  name?: string;
  code?: string;
}

export function useTenantSettings() {
  return useQuery({
    queryKey: [TENANT_KEY, 'current'],
    queryFn: async () => {
      // Get current tenant from auth context - this would typically be from the stored tenant
      const response = await api.get<Tenant>('/admin/tenants/current');
      return response.data;
    },
  });
}

export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTenantData }) => {
      const response = await api.patch<Tenant>(`/admin/tenants/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TENANT_KEY] });
    },
  });
}
