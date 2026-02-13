import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from './api';
import type { CurrentUser, AuthResponse, LoginRequest } from '@nerva/shared';

interface AuthState {
  user: CurrentUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  setHasHydrated: (state: boolean) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true, // Start as true until hydration completes
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state, isLoading: false });
      },

      login: async (data: LoginRequest) => {
        set({ isLoading: true });
        try {
          const response = await api.post<AuthResponse>('/auth/login', data);
          const { accessToken, user } = response.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('tenantId', data.tenantId);

          set({
            accessToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // Fetch full user with permissions
          await get().fetchUser();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tenantId');
        localStorage.removeItem('siteId');
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },

      fetchUser: async () => {
        try {
          const response = await api.get<CurrentUser>('/auth/me');
          set({ user: response.data });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: 'nerva-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // After hydration completes, set isLoading to false
        state?.setHasHydrated(true);
      },
    }
  )
);

export function hasPermission(
  user: CurrentUser | null,
  permission: string
): boolean {
  if (!user) return false;
  if (user.permissions.includes('system.admin')) return true;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: CurrentUser | null,
  permissions: string[]
): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

export function getHomeRoute(userType: string): string {
  switch (userType) {
    case 'customer': return '/portal';
    case 'driver': return '/driver';
    default: return '/dashboard';
  }
}
