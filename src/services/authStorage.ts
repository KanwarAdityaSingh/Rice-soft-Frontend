import type { PermissionsMap } from '../types/entities';

const ACCESS_TOKEN_KEY = 'auth:token';
const USER_KEY = 'auth:user';
const PERMISSIONS_KEY = 'auth:permissions';

const AUTH_KEYS = [ACCESS_TOKEN_KEY, USER_KEY, PERMISSIONS_KEY] as const;

/** Session-scoped storage — cleared when the browser session ends (matches refresh session cookie). */
function store(): Storage {
  return sessionStorage;
}

/** Drop legacy localStorage auth keys; migrate into sessionStorage when empty. */
export function migrateLegacyAuthStorage(): void {
  const session = store();
  for (const key of AUTH_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy != null && !session.getItem(key)) {
      session.setItem(key, legacy);
    }
    localStorage.removeItem(key);
  }
}

migrateLegacyAuthStorage();

export function getAccessToken(): string | null {
  return store().getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  store().setItem(ACCESS_TOKEN_KEY, token);
}

export function getStoredUser<T = Record<string, unknown>>(): T | null {
  try {
    const raw = store().getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    store().removeItem(USER_KEY);
    return null;
  }
}

export function setStoredUser(user: unknown): void {
  store().setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredPermissions(): PermissionsMap | null {
  try {
    const raw = store().getItem(PERMISSIONS_KEY);
    if (!raw || raw === 'null') return null;
    return JSON.parse(raw) as PermissionsMap;
  } catch {
    store().removeItem(PERMISSIONS_KEY);
    return null;
  }
}

export function setStoredPermissions(permissions: PermissionsMap | null): void {
  if (permissions) {
    store().setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
  } else {
    store().removeItem(PERMISSIONS_KEY);
  }
}

export function clearAuthStorage(): void {
  for (const key of AUTH_KEYS) {
    store().removeItem(key);
    localStorage.removeItem(key);
  }
}
