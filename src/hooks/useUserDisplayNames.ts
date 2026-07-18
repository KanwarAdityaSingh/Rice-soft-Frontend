import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { usersAPI } from '../services/users.api';
import type { User } from '../types/entities';

export function formatUserDisplayName(user: Pick<User, 'full_name' | 'username'>): string {
  return user.full_name?.trim() || user.username;
}

/** Resolves user IDs to display names (current profile + admin user list). */
export function useUserDisplayNames() {
  const { user } = useAuth();
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    if (user) {
      next[user.id] = formatUserDisplayName(user);
    }

    let cancelled = false;
    usersAPI
      .getAllUsers(true)
      .then((users) => {
        if (cancelled) return;
        for (const u of users) {
          next[u.id] = formatUserDisplayName(u);
        }
        setNames({ ...next });
      })
      .catch(() => {
        if (!cancelled) setNames({ ...next });
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.full_name, user?.username]);

  const resolve = useMemo(
    () => (userId?: string | null) => {
      if (!userId) return null;
      return names[userId] ?? null;
    },
    [names]
  );

  return { resolve, names, ready: Object.keys(names).length > 0 };
}
