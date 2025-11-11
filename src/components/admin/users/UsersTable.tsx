import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../shared/SearchBar';
import { FilterDropdown } from '../shared/FilterDropdown';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { ActionButtons } from '../shared/ActionButtons';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Users } from 'lucide-react';
import { useUsers } from '../../../hooks/useUsers';
import type { User } from '../../../types/entities';

interface UsersTableProps {
  onEditUser?: (user: User) => void;
}

export function UsersTable({ onEditUser }: UsersTableProps) {
  const { users, loading, deleteUser, toggleUserStatus } = useUsers();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; full_name?: string; username?: string } | null>(null);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter ? (statusFilter === 'active' ? user.is_active : !user.is_active) : true;
    const matchesType = typeFilter ? user.user_type === typeFilter : true;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div>
      {/* Filters Section - Responsive */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by username, name, or email..." />
        </div>
        <div className="flex gap-2">
          <FilterDropdown
            label="Status"
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <FilterDropdown
            label="Type"
            options={[
              { label: 'Admin', value: 'admin' },
              { label: 'System User', value: 'custom' },
              { label: 'Vendor', value: 'vendor' },
              { label: 'Salesperson', value: 'salesman' },
              { label: 'Broker', value: 'broker' },
            ]}
            value={typeFilter}
            onChange={setTypeFilter}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Get started by creating a new user or adjust your filters."
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Username</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Full Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Last Login</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-sm">{user.username}</td>
                    <td className="py-3 px-4 text-sm">{user.full_name}</td>
                    <td className="py-3 px-4 text-sm">{user.email}</td>
                    <td className="py-3 px-4 text-sm">{user.phone || '-'}</td>
                    <td className="py-3 px-4 text-sm capitalize">{user.user_type}</td>
                    <td className="py-3 px-4 text-sm">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                  <td className="py-3 px-4 text-right">
                      <ActionButtons
                        isActive={user.is_active}
                        onEdit={onEditUser ? () => onEditUser(user) : undefined}
                        onToggleStatus={() => toggleUserStatus(user.id, user.is_active)}
                        onDelete={() => {
                          setSelectedUser(user);
                          setDeleteDialogOpen(true);
                        }}
                        onPermissions={() => navigate(`/admin/users/${user.id}/permissions`)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="card-glow rounded-xl p-4 space-y-3 hover:shadow-lg transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{user.full_name}</h3>
                    <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs whitespace-nowrap ${
                    user.is_active 
                      ? 'bg-emerald-500/10 text-emerald-600' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Email</span>
                    <p className="truncate">{user.email}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-muted-foreground text-xs">Phone</span>
                      <p className="truncate">{user.phone || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Type</span>
                      <p className="capitalize">{user.user_type}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Last Login</span>
                    <p>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <ActionButtons
                    isActive={user.is_active}
                    onEdit={onEditUser ? () => onEditUser(user) : undefined}
                    onToggleStatus={() => toggleUserStatus(user.id, user.is_active)}
                    onDelete={() => {
                      setSelectedUser(user);
                      setDeleteDialogOpen(true);
                    }}
                    onPermissions={() => navigate(`/admin/users/${user.id}/permissions`)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {filteredUsers.length} of {users.length} users</span>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedUser) {
            await deleteUser(selectedUser.id);
            setDeleteDialogOpen(false);
            setSelectedUser(null);
          }
        }}
        title="Delete User"
        description={`Are you sure you want to delete ${selectedUser?.full_name || selectedUser?.username}? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}



