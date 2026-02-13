import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/lib/config';

// Base URL configuration
export const BASE_URL = API_BASE_URL;

// API Response wrapper type
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

class ApiService {
  private api: AxiosInstance;
  private isRefreshing = false;
  private isRedirecting = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add auth token to requests
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Block all requests if redirecting to login
        if (this.isRedirecting) {
          console.log('[API] Blocking request, redirect in progress');
          return Promise.reject(new Error('Redirecting to login'));
        }

        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle errors and token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          console.log('[401] Detected, retry flag:', originalRequest._retry);

          if (this.isRefreshing) {
            console.log('[401] Already refreshing, queuing request');
            // Queue requests while token is being refreshed
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                // Update request header with new token
                if (token && originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return this.api(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          const refreshToken = this.getRefreshToken();
          console.log('[401] Refresh token exists:', !!refreshToken);

          // No refresh token - clear auth and force redirect
          if (!refreshToken) {
            console.log('[401] No refresh token, redirecting to login');
            this.isRefreshing = false;
            this.isRedirecting = true;
            this.failedQueue = []; // Clear queue
            this.clearAuth();
            // Use replace to prevent back button issues
            window.location.replace('/login');
            return Promise.reject(new Error('No refresh token available'));
          }

          try {
            console.log('[401] Attempting token refresh');
            // Attempt to refresh the token
            const response = await this.refreshAccessToken(refreshToken);
            // Backend wraps response in { status, message, data: { access_token } }
            const { access_token } = response.data.data;

            console.log('[401] Token refresh successful, token:', !!access_token);
            // Update stored tokens
            this.setAccessToken(access_token);
            if (response.data.data.refresh_token) {
              localStorage.setItem('refresh_token', response.data.data.refresh_token);
            }

            // Update the Authorization header with the new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
            }

            // Retry all queued requests with new token
            this.processQueue(null, access_token);

            // Retry the original request with new token
            return this.api(originalRequest);
          } catch (refreshError) {
            console.log('[401] Token refresh failed, redirecting to login');
            // Refresh failed - clear auth and redirect to login
            this.isRefreshing = false;
            this.isRedirecting = true;
            this.processQueue(refreshError);
            this.failedQueue = []; // Clear queue
            this.clearAuth();
            // Use replace to prevent back button issues
            window.location.replace('/login');
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token?: string) {
    this.failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  // Token management
  private getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private setAccessToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  private clearAuth(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('admin_user');
  }

  // Token refresh endpoint
  private async refreshAccessToken(refreshToken: string) {
    return axios.post(`${BASE_URL}admin/auth/refresh`, {
      refresh_token: refreshToken,
    });
  }

  // Health check with retry logic
  async healthCheck(maxRetries = 3): Promise<boolean> {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const response = await this.api.get('/health');
        return response.status === 200;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error('Health check failed after max retries:', error);
          return false;
        }
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
      }
    }
    return false;
  }

  // HTTP Methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.patch<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handling
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiResponse>;

      if (axiosError.response) {
        // Server responded with error status
        const message = axiosError.response.data?.message || axiosError.response.data?.error || 'An error occurred';
        return new Error(message);
      } else if (axiosError.request) {
        // Request made but no response received
        return new Error('No response from server. Please check your connection.');
      } else {
        // Error in request setup
        return new Error(axiosError.message || 'Request failed');
      }
    }

    return error instanceof Error ? error : new Error('An unexpected error occurred');
  }

  // Get the underlying axios instance (for advanced use cases)
  getAxiosInstance(): AxiosInstance {
    return this.api;
  }
}

// Export singleton instance
export const apiService = new ApiService();
