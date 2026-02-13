import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nerva-platform.onrender.com';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      config.headers['x-tenant-id'] = tenantId;
    }

    const siteId = localStorage.getItem('siteId');
    if (siteId) {
      config.headers['x-site-id'] = siteId;
    }
  }
  return config;
});

// Custom error class with better message extraction
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Extract readable error message from API response
function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data;
    // Handle NestJS validation errors
    if (Array.isArray(data.message)) {
      return data.message.join(', ');
    }
    // Handle standard error message
    if (typeof data.message === 'string') {
      return data.message;
    }
    // Handle error field
    if (typeof data.error === 'string') {
      return data.error;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = extractErrorMessage(error);
      const code = error.response?.data?.code;

      // Handle 401 - redirect to login (skip for auth endpoints to avoid loops)
      if (status === 401) {
        const requestUrl = error.config?.url || '';
        const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/me');
        if (typeof window !== 'undefined' && !isAuthEndpoint && !window.location.pathname.startsWith('/login')) {
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
        }
      }

      // Log error for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error(`API Error [${status}]:`, message, error.response?.data);
      }

      return Promise.reject(new ApiError(message, status, code));
    }
    return Promise.reject(error);
  }
);

export default api;
