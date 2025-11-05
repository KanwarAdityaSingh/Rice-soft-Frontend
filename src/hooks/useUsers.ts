import { useState, useEffect } from 'react';
import { usersAPI } from '../services/users.api';
import type { User, CreateUserRequest, UpdateUserRequest } from '../types/entities';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
      setError(null);
    try {
      const data = await usersAPI.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const createUser = async (data: CreateUserRequest) => {
    try {
      const newUser = await usersAPI.createUser(data);
      // Refetch all users to ensure we have the latest data from the server
      await fetchUsers();
      return newUser;
    } catch (err: any) {
      throw err;
    }
  };

  const updateUser = async (id: string, data: UpdateUserRequest) => {
    try {
      const updatedUser = await usersAPI.updateUser(id, data);
      setUsers(users.map((u) => (u.id === id ? updatedUser : u)));
      return updatedUser;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await usersAPI.deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
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
