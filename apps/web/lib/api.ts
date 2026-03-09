import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

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

// Refresh token queue to prevent multiple simultaneous refresh calls
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = extractErrorMessage(error);
      const code = error.response?.data?.code;
      const originalRequest = error.config;

      // Handle 401 - attempt token refresh before redirecting
      if (status === 401 && originalRequest) {
        const requestUrl = originalRequest.url || '';
        const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/refresh');

        if (!isAuthEndpoint && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          const refreshToken = localStorage.getItem('refreshToken');

          if (refreshToken) {
            if (isRefreshing) {
              // Queue this request until refresh completes
              return new Promise((resolve, reject) => {
                failedQueue.push({
                  resolve: (token: string) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    resolve(api(originalRequest));
                  },
                  reject: (err: unknown) => {
                    reject(err);
                  },
                });
              });
            }

            isRefreshing = true;

            try {
              const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

              localStorage.setItem('accessToken', newAccessToken);
              localStorage.setItem('refreshToken', newRefreshToken);

              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

              processQueue(null, newAccessToken);
              return api(originalRequest);
            } catch (refreshError) {
              processQueue(refreshError, null);
              // Refresh failed - clear tokens and redirect to login
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
              return Promise.reject(new ApiError('Session expired', 401));
            } finally {
              isRefreshing = false;
            }
          } else {
            // No refresh token available - redirect to login
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
          }
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
