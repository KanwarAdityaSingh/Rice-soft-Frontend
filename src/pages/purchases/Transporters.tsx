import { useMemo, useState } from 'react';
import { Truck, Plus, MapPin, Phone, Mail, Building2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../../components/admin/shared/SearchBar';
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner';
import { EmptyState } from '../../components/admin/shared/EmptyState';
import { ActionButtons } from '../../components/admin/shared/ActionButtons';
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog';
import { TransporterFormModal } from '../../components/purchases/TransporterFormModal';
import { useTransporters } from '../../hooks/useTransporters';
import type { Transporter } from '../../types/entities';

export default function TransportersPage() {
  const { transporters, loading, deleteTransporter, refetch } = useTransporters();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return transporters.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        t.business_name.toLowerCase().includes(q) ||
        t.contact_person.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.address.city.toLowerCase().includes(q) ||
        t.address.state.toLowerCase().includes(q) ||
        t.vehicle_numbers?.some((vn) => vn.toLowerCase().includes(q));

      return matchesSearch;
    });
  }, [transporters, searchQuery]);

  const handleEdit = (id: string) => {
    setSelectedTransporterId(id);
    setEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setSelectedId(id);
    setDeleteDialogOpen(true);
  };

  const stats = useMemo(() => {
    return {
      total: transporters.length,
      active: transporters.filter((t) => t.is_active).length,
      inactive: transporters.filter((t) => !t.is_active).length,
    };
  }, [transporters]);

  if (loading) {
    return (
      <div className="container mx-auto py-6 sm:py-10 px-4 sm:px-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      <header className="hero-bg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <button 
            onClick={() => navigate('/purchases')} 
            className="mb-4 btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Purchases
          </button>
          <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              <span className="text-gradient">Transporters</span>
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
              Manage transportation service providers
            </p>
          </div>
          <button onClick={() => setCreateModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Transporter
          </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="glass rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="glass rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Inactive</p>
          <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by business name, contact person, phone, city..."
        />
      </div>

      {/* Transporters List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No transporters found"
          description={searchQuery ? 'Try adjusting your search' : 'Create your first transporter'}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((transporter) => (
            <div
              key={transporter.id}
              className="glass rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{transporter.business_name}</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      transporter.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {transporter.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <ActionButtons
                    onEdit={() => handleEdit(transporter.id)}
                    onDelete={() => handleDelete(transporter.id)}
                  />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{transporter.contact_person}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{transporter.phone}</span>
                </div>
                {transporter.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{transporter.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">
                    {transporter.address.city}, {transporter.address.state}
                  </span>
                </div>
                {transporter.vehicle_numbers && transporter.vehicle_numbers.length > 0 && (
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-xs text-muted-foreground mb-1">Vehicles ({transporter.vehicle_numbers.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {transporter.vehicle_numbers.slice(0, 3).map((vn, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-primary/10 text-primary"
                        >
                          {vn}
                        </span>
                      ))}
                      {transporter.vehicle_numbers.length > 3 && (
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-muted text-muted-foreground">
                          +{transporter.vehicle_numbers.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {transporter.gst_number && (
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-xs text-muted-foreground">GST: {transporter.gst_number}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TransporterFormModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) refetch();
        }}
        transporterId={null}
      />

      <TransporterFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedTransporterId(null);
            refetch();
          }
        }}
        transporterId={selectedTransporterId}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedId) {
            await deleteTransporter(selectedId);
            setDeleteDialogOpen(false);
            setSelectedId(null);
          }
        }}
        title="Delete Transporter"
        description="Are you sure you want to delete this transporter? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}

