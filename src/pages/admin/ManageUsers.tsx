import { useState } from 'react';
import { Plus } from 'lucide-react';
import { UsersTable } from '../../components/admin/users/UsersTable';
import { UserFormModal } from '../../components/admin/users/UserFormModal';
import { useUsers } from '../../hooks/useUsers';
import type { User } from '../../types/entities';

export default function ManageUsers() {
  const { refetch: refetchUsers } = useUsers();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);


  return (
    <div className="container mx-auto py-10 space-y-8">
      <header className="hero-bg rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-bold"><span className="text-gradient">User Management</span></h1>
          <p className="mt-2 text-muted-foreground">Create, edit and manage application users</p>
        </div>
      </header>

      {/* Create Button */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => {
            setEditingUser(null);
            setUserModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="card-glow rounded-2xl p-6 highlight-box">
        <UsersTab onEditUser={handleEditUser} />
      </div>

      {/* Modals */}
      <UserFormModal 
        open={userModalOpen} 
        onOpenChange={(open) => {
          setUserModalOpen(open);
          if (!open) {
            setEditingUser(null);
            refetchUsers(); // Refresh the users list when modal closes
          }
        }} 
        user={editingUser}
      />
      {/* Removed non-user modals */}
    </div>
  );

  function handleEditUser(user: User) {
    setEditingUser(user);
    setUserModalOpen(true);
  }
}

function UsersTab({ onEditUser }: { onEditUser: (user: User) => void }) {
  return <UsersTable onEditUser={onEditUser} />;
}

// Removed non-user tabs

