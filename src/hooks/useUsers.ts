import { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '../services/users.api';
import type { User, CreateUserRequest, UpdateUserRequest } from '../types/entities';

export interface UseUsersOptions {
  /** When true, returns active + inactive. Default list is active only. */
  includeInactive?: boolean;
}

export function useUsers(options?: UseUsersOptions) {
  const includeInactive = options?.includeInactive ?? false;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersAPI.getAllUsers(includeInactive);
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const createUser = async (data: CreateUserRequest) => {
    try {
      const newUser = await usersAPI.createUser(data);
      await fetchUsers();
      return newUser;
    } catch (err: any) {
      throw err;
    }
  };

  const updateUser = async (id: string, data: UpdateUserRequest) => {
    try {
      const updatedUser = await usersAPI.updateUser(id, data);
      setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));
      return updatedUser;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await usersAPI.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  const toggleUserStatus = async (id: string, isActive: boolean) => {
    try {
      await updateUser(id, { is_active: !isActive });
    } catch (err) {
      // Error already handled in updateUser
    }
  };

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    refetch: fetchUsers,
  };
}
