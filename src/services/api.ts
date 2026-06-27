// API configuration and base service
import { sanitizePhoneInput } from '../utils/validation';
import { clearAuthStorage, getAccessToken, setAccessToken } from './authStorage';

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  ((import.meta as any).env?.DEV ? '/api/v1' : 'http://localhost:3000/api/v1');

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  /** Present on create/update when bank verification fails leniently (e.g. holder name mismatch). */
  verification_error?: string;
  /** True when create/update persisted but bank verification did not pass. */
  bank_verification_flagged?: boolean;
  /** True when driver was saved but Surepass returned no transport licence DOE. */
  transport_doe_not_found?: boolean;
  /** Present on vendor-create when verify_bank succeeded (Surepass + markBankDetailsVerified) */
  verification_message?: string;
  timestamp?: string;
  isSessionValid?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  full_name: string;
  phone: string | null;
  user_type: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

import type { PermissionsMap } from '../types/entities';

export interface LoginResponse {
  user: UserResponse;
  token: string;
  expires_in: string;
  /** Refresh token lifetime (httpOnly cookie set by server; not stored client-side). */
  refresh_expires_in?: string;
  permissions?: PermissionsMap | null;
}

export interface RefreshTokenResponse {
  token: string;
  expires_in: string;
}

export interface RequestOtpData {
  sent: boolean;
}

class ApiError extends Error {
  public status: number;
  public data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const AUTH_SKIP_REFRESH_ENDPOINTS = new Set([
  '/auth/loginUser',
  '/auth/requestOtp',
  '/auth/verifyOtp',
  '/auth/refreshToken',
]);

const AUTH_SKIP_UNAUTHORIZED_REDIRECT = new Set([
  '/auth/loginUser',
  '/auth/requestOtp',
  '/auth/verifyOtp',
]);

class ApiService {
  private baseURL: string;
  private logoutCallback: (() => void) | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  /** Coalesce identical in-flight GETs (e.g. React Strict Mode double-mount). */
  private inFlightGetByUrl = new Map<string, Promise<ApiResponse<unknown>>>();

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  setLogoutCallback(callback: () => void) {
    this.logoutCallback = callback;
  }

  private static isHandlingInvalidSession = false;

  inspectSessionFromResponse(data: unknown): void {
    if (
      data &&
      typeof data === 'object' &&
      (data as ApiResponse).isSessionValid === false
    ) {
      this.handleSessionInvalidation();
    }
  }

  /** Exchange httpOnly refresh cookie for a new access token. Returns null on failure. */
  async tryRefreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseURL}/auth/refreshToken`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        return null;
      }

      const data = await response.json();
      this.inspectSessionFromResponse(data);

      if (!response.ok) {
        return null;
      }

      const token = (data?.data as RefreshTokenResponse | undefined)?.token;
      if (!token) {
        return null;
      }

      setAccessToken(token);
      return token;
    } catch {
      return null;
    }
  }

  /** Reset session-invalidation guard after a fresh login. */
  resetSessionInvalidationGuard() {
    ApiService.isHandlingInvalidSession = false;
  }

  private handleSessionInvalidation() {
    if (ApiService.isHandlingInvalidSession) return;
    ApiService.isHandlingInvalidSession = true;

    clearAuthStorage();

    if (this.logoutCallback) {
      try {
        this.logoutCallback();
      } catch {
        // ignore
      }
    }

    try {
      window.dispatchEvent(new CustomEvent('riceops:session-invalid'));
    } catch {
      // ignore
    }

    const basename = (import.meta as any).env?.BASE_URL
      ? (import.meta as any).env.BASE_URL.replace(/\/$/, '')
      : '/riceops';
    const loginPath = `${basename}/login`;

    setTimeout(() => {
      const currentPath = window.location.pathname;
      if (!currentPath.endsWith('/login') && currentPath !== loginPath) {
        window.location.href = loginPath;
      }
    }, 1500);
  }

  private handleUnauthorized(endpoint: string) {
    clearAuthStorage();

    if (this.logoutCallback) {
      try {
        this.logoutCallback();
      } catch {
        // ignore
      }
    }

    if (AUTH_SKIP_UNAUTHORIZED_REDIRECT.has(endpoint)) {
      return;
    }

    const basename = (import.meta as any).env?.BASE_URL
      ? (import.meta as any).env.BASE_URL.replace(/\/$/, '')
      : '/riceops';
    const loginPath = `${basename}/login`;
    const currentPath = window.location.pathname;

    if (!currentPath.endsWith('/login') && currentPath !== loginPath) {
      window.location.href = loginPath;
    }
  }

  private shouldSkipTokenRefresh(endpoint: string): boolean {
    return AUTH_SKIP_REFRESH_ENDPOINTS.has(endpoint);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const method = (options.method ?? 'GET').toUpperCase();

    const execute = async (retry: boolean): Promise<ApiResponse<T>> => {
      const config: RequestInit = {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      };

      const token = getAccessToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }

      try {
        const response = await fetch(url, config);
        const data = await response.json();

        this.inspectSessionFromResponse(data);

        if (!response.ok) {
          if (
            response.status === 401 &&
            !retry &&
            !this.shouldSkipTokenRefresh(endpoint)
          ) {
            const newToken = await this.tryRefreshAccessToken();
            if (newToken) {
              return execute(true);
            }
          }

          if (response.status === 401) {
            this.handleUnauthorized(endpoint);
          }

          console.error('API Error:', { url, status: response.status, data });
          throw new ApiError(
            data.message || data.error || 'An error occurred',
            response.status,
            data
          );
        }

        return data;
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }

        throw new ApiError(
          'Network error. Please check your connection.',
          0,
          error
        );
      }
    };

    if (method === 'GET' && !isRetry) {
      const existing = this.inFlightGetByUrl.get(url);
      if (existing) {
        return existing as Promise<ApiResponse<T>>;
      }
      const pending = execute(false).finally(() => {
        this.inFlightGetByUrl.delete(url);
      }) as Promise<ApiResponse<unknown>>;
      this.inFlightGetByUrl.set(url, pending);
      return pending as Promise<ApiResponse<T>>;
    }

    return execute(isRetry);
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/loginUser', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return response.data;
  }

  async requestOtp(phone: string): Promise<RequestOtpData> {
    const normalizedPhone = sanitizePhoneInput(phone);
    if (normalizedPhone.length !== 10) {
      throw new ApiError('Phone must be 10 digits', 400);
    }
    const data = await this.post<RequestOtpData>('/auth/requestOtp', {
      phone: normalizedPhone,
    });
    return data;
  }

  async verifyOtp(phone: string, otp: string): Promise<LoginResponse> {
    const normalizedPhone = sanitizePhoneInput(phone);
    const normalizedOtp = otp.replace(/\D/g, '').slice(0, 6);
    if (normalizedPhone.length !== 10) {
      throw new ApiError('Phone must be 10 digits', 400);
    }
    if (normalizedOtp.length !== 6) {
      throw new ApiError('OTP must be 6 digits', 400);
    }
    const data = await this.post<LoginResponse>('/auth/verifyOtp', {
      phone: normalizedPhone,
      otp: normalizedOtp,
    });
    return data;
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    const token = await this.tryRefreshAccessToken();
    if (!token) {
      throw new ApiError('Unable to refresh session', 401);
    }
    return { token, expires_in: '' };
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Still clear local state when server logout fails
    } finally {
      clearAuthStorage();
    }
  }

  async getProfile(): Promise<UserResponse> {
    const response = await this.request<UserResponse>('/auth/profile');
    return response.data;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'GET',
    });
    return response.data;
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.data;
  }

  async postEnvelope<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async putEnvelope<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.data;
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'DELETE',
    });
    return response.data;
  }
}

export const apiService = new ApiService();
export { ApiError };
