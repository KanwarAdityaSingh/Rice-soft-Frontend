import { apiService, ApiError } from './api';

export const authAPI = {
  // Change user password
  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    try {
      await apiService.post<null>('/auth/changeUserPassword', {
        old_password: oldPassword,
        new_password: newPassword,
      });
    } catch (error) {
      // Re-throw to allow caller to map UI errors appropriately
      if (error instanceof ApiError) {
        throw error;
      }
      throw error as Error;
    }
  },
};


