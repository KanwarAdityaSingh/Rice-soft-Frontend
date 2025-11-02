import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { PermissionAction, PermissionsEntityKey } from '../types/entities';
import { hasAccess, isAdmin, isCustomUser } from '../utils/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  entity?: PermissionsEntityKey;
  action?: PermissionAction;
}

export function ProtectedRoute({ 
  children, 
  redirectTo = '/login',
  entity,
  action,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (entity && action) {
    // Admin has full access
    if (isAdmin()) return <>{children}</>;
    // Custom users require permission
    if (isCustomUser() && hasAccess(entity, action)) return <>{children}</>;
    // Otherwise unauthorized
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
