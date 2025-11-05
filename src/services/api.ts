// API configuration and base service
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
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
  permissions?: PermissionsMap | null;
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

class ApiService {
  private baseURL: string;
  private logoutCallback: (() => void) | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Allow AuthProvider to register logout callback
  setLogoutCallback(callback: () => void) {
    this.logoutCallback = callback;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authorization header if token exists
    const token = localStorage.getItem('auth:token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle 401 Unauthorized - session expired or invalid token
        // Only trigger logout if this is an authenticated request (not login endpoint)
        if (response.status === 401 && endpoint !== '/auth/loginUser') {
          // Clear auth data from localStorage
          localStorage.removeItem('auth:token');
          localStorage.removeItem('auth:user');
          localStorage.removeItem('auth:permissions');
          
          // Call logout callback if registered (to update React state)
          if (this.logoutCallback) {
            this.logoutCallback();
          }
          
          // Redirect to login page (respecting basename if configured)
          const basename = (import.meta as any).env?.BASE_URL 
            ? (import.meta as any).env.BASE_URL.replace(/\/$/, '') 
            : '/riceops';
          const loginPath = `${basename}/login`;
          const currentPath = window.location.pathname;
          
          // Only redirect if not already on login page
          if (!currentPath.endsWith('/login') && currentPath !== loginPath) {
            window.location.href = loginPath;
          }
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
      
      // Network or other errors
      throw new ApiError(
        'Network error. Please check your connection.',
        0,
        error
      );
    }
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    console.log('Login request:', { endpoint: '/auth/loginUser', credentials });
    const response = await this.request<LoginResponse>('/auth/loginUser', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return response.data;
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getProfile(): Promise<UserResponse> {
    const response = await this.request<UserResponse>('/auth/profile');
    return response.data;
  }

  // Generic methods for other endpoints
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

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PUT',
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
