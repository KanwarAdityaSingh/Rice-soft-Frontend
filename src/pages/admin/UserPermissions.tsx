import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usersAPI } from '../../services/users.api';
import type { User, PermissionsMap } from '../../types/entities';
import { PermissionsTableSimple } from '../../components/admin/users/PermissionsTableSimple';
import { useToast } from '../../components/shared/Toast';
import { CheckCircle2, X } from 'lucide-react';

export default function UserPermissionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<PermissionsMap>({});

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const u = await usersAPI.getUserById(id);
        setUser(u);
        // If backend returns permissions with user, hydrate; else keep defaults
        const anyUser = u as any;
        if (anyUser && anyUser.permissions && typeof anyUser.permissions === 'object') {
          setPermissions(anyUser.permissions as PermissionsMap);
        }
      } catch (e: any) {
        error('Failed to load user', e?.message || '');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const isCustom = useMemo(() => user?.user_type === 'custom', [user?.user_type]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await usersAPI.updatePermissions(id, permissions);
      success('Permissions updated', 'User permissions updated successfully');
    } catch (e: any) {
      error('Failed to update permissions', e?.message || '');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading user...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="card-glow rounded-xl p-6">
          <p className="text-sm">User not found.</p>
          <div className="mt-4">
            <button className="btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6 relative z-[60] isolate pointer-events-auto">
      <header className="hero-bg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden pointer-events-none z-40">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            <span className="text-gradient">Manage Permissions</span>
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
            Configure entity-based access for this user
          </p>
        </div>
      </header>

      <div className="card-glow rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-6 relative z-10 pointer-events-auto highlight-box">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-base font-semibold">{user.full_name || user.username}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-md text-xs capitalize bg-muted text-muted-foreground">{user.user_type}</span>
            {!isCustom && (
              <span className="px-2 py-1 rounded-md text-xs bg-orange-500/10 text-orange-700 dark:text-orange-300">
                Permissions applicable only to custom users
              </span>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Permissions Matrix</h2>
          <p className="text-xs text-muted-foreground">Toggle allowed actions for each entity below.</p>
        </div>

        <PermissionsTableSimple value={permissions} onChange={setPermissions} />

        <div className="flex items-center justify-end gap-2 pointer-events-auto relative z-50 border-t border-border/60 pt-4">
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => navigate(-1)} disabled={saving}>
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={handleSave} disabled={saving || !isCustom}>
            <CheckCircle2 className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}


