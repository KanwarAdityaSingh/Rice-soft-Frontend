import { useMemo, useState } from 'react';
import { SearchBar } from '../shared/SearchBar';
import { FilterDropdown } from '../shared/FilterDropdown';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { ActionButtons } from '../shared/ActionButtons';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import { IdCard, Shield } from 'lucide-react';
import { useDrivers } from '../../../hooks/useDrivers';
import { driversAPI } from '../../../services/drivers.api';
import { DriverFormModal } from './DriverFormModal';
import type { Driver } from '../../../types/entities';

type ListScope = 'active' | 'inactive' | 'all';

export function DriversTable() {
  const [listScope, setListScope] = useState<ListScope>('active');
  const includeInactive = listScope !== 'active';

  const { drivers, loading, refetch } = useDrivers(includeInactive);
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const filtered = useMemo(() => {
    return drivers.filter((d) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        d.license_number.toLowerCase().includes(q) ||
        d.phone.includes(searchQuery.replace(/\D/g, '')) ||
        (d.name?.toLowerCase().includes(q) ?? false);

      const matchesScope =
        listScope === 'all' ? true : listScope === 'active' ? d.is_active : !d.is_active;

      const matchesVerification = verificationFilter
        ? verificationFilter === 'verified'
          ? d.is_verified
          : !d.is_verified
        : true;

      return matchesSearch && matchesScope && matchesVerification;
    });
  }, [drivers, searchQuery, listScope, verificationFilter]);

  const handleDelete = async () => {
    if (!selectedDriver) return;
    setDeleting(true);
    try {
      await driversAPI.deleteDriver(selectedDriver.id);
      void refetch();
      setDeleteDialogOpen(false);
      setSelectedDriver(null);
    } catch (error: unknown) {
      setAlertType('error');
      setAlertTitle('Failed to delete');
      setAlertMessage(error instanceof Error ? error.message : 'Delete failed');
      setAlertOpen(true);
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date: string | null): string => {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by licence, phone, or name…"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <select
              className="bg-transparent text-sm outline-none cursor-pointer"
              value={listScope}
              onChange={(e) => setListScope(e.target.value as ListScope)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>
          </label>
          <FilterDropdown
            label="Verified"
            options={[
              { label: 'Verified', value: 'verified' },
              { label: 'Unverified', value: 'unverified' },
            ]}
            value={verificationFilter}
            onChange={setVerificationFilter}
          />
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 px-4 py-2"
          >
            Add driver
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={IdCard}
          title="No drivers found"
          description="Add a driver or adjust filters."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold">License</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Phone</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Verified</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((driver) => (
                <tr
                  key={driver.id}
                  className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium font-mono">{driver.license_number}</span>
                      {driver.is_verified && (
                        <span title="Verified" className="inline-flex">
                          <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-hidden />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">{driver.name || '—'}</td>
                  <td className="py-3 px-4 text-sm">{driver.phone}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {driver.is_verified ? formatDate(driver.verified_at) : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md ${
                        driver.is_active
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {driver.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <ActionButtons
                      onEdit={() => {
                        setSelectedDriverId(driver.id);
                        setEditModalOpen(true);
                      }}
                      onDelete={() => {
                        setSelectedDriver(driver);
                        setDeleteDialogOpen(true);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DriverFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) void refetch();
        }}
      />

      <DriverFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedDriverId(null);
            void refetch();
          }
        }}
        driverId={selectedDriverId}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete driver"
        description={`Deactivate driver with licence “${selectedDriver?.license_number}”? You can include inactive rows later to restore.`}
        confirmText={deleting ? 'Deleting…' : 'Delete'}
        onConfirm={handleDelete}
        variant="danger"
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />
    </div>
  );
}
