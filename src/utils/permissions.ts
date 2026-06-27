import type { PermissionsMap, PermissionAction, PermissionsEntityKey } from '../types/entities';
import { getStoredPermissions, getStoredUser, setStoredPermissions } from '../services/authStorage';

let cachedPermissions: PermissionsMap | null | undefined;

export const getPermissions = (): PermissionsMap | null => {
  if (cachedPermissions !== undefined) return cachedPermissions as PermissionsMap | null;
  cachedPermissions = getStoredPermissions();
  return cachedPermissions;
};

export const setPermissions = (permissions: PermissionsMap | null) => {
  cachedPermissions = permissions;
  setStoredPermissions(permissions);
};

export const can = (entity: PermissionsEntityKey, action: PermissionAction): boolean => {
  try {
    const permissions = getPermissions();
    if (!permissions || typeof permissions !== 'object') return false;
    const entityPerms = permissions[entity];
    if (!entityPerms || typeof entityPerms !== 'object') return false;
    return entityPerms[action] === true;
  } catch {
    return false;
  }
};

export const canCreate = (entity: PermissionsEntityKey) => can(entity, 'create');
export const canRead = (entity: PermissionsEntityKey) => can(entity, 'read');
export const canUpdate = (entity: PermissionsEntityKey) => can(entity, 'update');
export const canDelete = (entity: PermissionsEntityKey) => can(entity, 'delete');

export const getEntityPermissions = (entity: PermissionsEntityKey) => getPermissions()?.[entity] || null;

export const isCustomUser = (): boolean => {
  const user = getStoredUser<{ user_type?: string }>();
  return user?.user_type === 'custom';
};

export const isAdmin = (): boolean => {
  const user = getStoredUser<{ user_type?: string }>();
  return user?.user_type === 'admin';
};

export const hasAccess = (entity: PermissionsEntityKey, action: PermissionAction): boolean => {
  if (isAdmin()) return true;
  if (isCustomUser()) return can(entity, action);
  return false;
};

export const PERMISSION_ENTITIES: PermissionsEntityKey[] = ['salesman', 'broker', 'vendor', 'leads', 'riceCode'];
export const PERMISSION_ACTIONS: PermissionAction[] = ['create', 'read', 'update', 'delete'];
