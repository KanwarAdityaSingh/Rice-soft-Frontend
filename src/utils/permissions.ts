import type { PermissionsMap, PermissionAction, PermissionsEntityKey } from '../types/entities';

const STORAGE_KEY = 'auth:permissions';

let cachedPermissions: PermissionsMap | null | undefined;

export const getPermissions = (): PermissionsMap | null => {
  if (cachedPermissions !== undefined) return cachedPermissions as any;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cachedPermissions = raw ? JSON.parse(raw) : null;
    return cachedPermissions;
  } catch {
    cachedPermissions = null;
    return null;
  }
};

export const setPermissions = (permissions: PermissionsMap | null) => {
  cachedPermissions = permissions;
  if (permissions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
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
  try {
    const user = JSON.parse(localStorage.getItem('auth:user') || '{}');
    return user?.user_type === 'custom';
  } catch {
    return false;
  }
};

export const isAdmin = (): boolean => {
  try {
    const user = JSON.parse(localStorage.getItem('auth:user') || '{}');
    return user?.user_type === 'admin';
  } catch {
    return false;
  }
};

export const hasAccess = (entity: PermissionsEntityKey, action: PermissionAction): boolean => {
  if (isAdmin()) return true; // Admin bypass
  if (isCustomUser()) return can(entity, action);
  return false; // Non-custom users use user_type logic elsewhere; default false here
};

export const PERMISSION_ENTITIES: PermissionsEntityKey[] = ['salesman', 'broker', 'vendor', 'leads', 'riceCode'];
export const PERMISSION_ACTIONS: PermissionAction[] = ['create', 'read', 'update', 'delete'];


