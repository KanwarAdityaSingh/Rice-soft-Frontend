import { apiService } from './api';
import type { User, CreateUserRequest, UpdateUserRequest } from '../types/entities';

export const usersAPI = {
  // Get all users
  getAllUsers: (includeInactive: boolean = false, userType?: string) => {
    let url = '/users/getAllUsers';
    const params = new URLSearchParams();
    if (includeInactive) params.append('include_inactive', 'true');
    if (userType) params.append('user_type', userType);
    if (params.toString()) url += `?${params.toString()}`;
    return apiService.get<User[]>(url);
  },

  // Get user by ID
  getUserById: (id: string) => {
    return apiService.get<User>(`/users/getUserById/${id}`);
  },

  // Create user
  createUser: (data: CreateUserRequest) => {
    return apiService.post<User>('/users/createUser', data);
  },

  // Update user
  updateUser: (id: string, data: UpdateUserRequest) => {
    return apiService.post<User>(`/users/updateUser/${id}`, data);
  },

  // Delete user
  deleteUser: (id: string) => {
    return apiService.post<{ success: boolean; message: string }>(`/users/deleteUser/${id}`);
  },
};

