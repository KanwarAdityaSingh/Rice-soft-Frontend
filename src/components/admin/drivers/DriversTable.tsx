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
import { formatPhoneDisplay } from '../../../utils/validation';
import { formatDriverVerifiedAt } from '../../../utils/driverVerification';
import { driverProfileImageSrc } from '../../../utils/driverProfile';
import { DriverVehicleClassBadges } from './DriverVehicleClassBadges';

export function DriversTable() {
  const [verificationFilter, setVerificationFilter] = useState<string | undefined>();
  const isVerifiedParam =
    verificationFilter === 'verified' ? true : verificationFilter === 'unverified' ? false : undefined;

  const { drivers, loading, refetch } = useDrivers({ isVerified: isVerifiedParam });
  const [searchQuery, setSearchQuery] = useState('');
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
        formatPhoneDisplay(d.phone).includes(searchQuery) ||
        (d.name?.toLowerCase().includes(q) ?? false);

      return matchesSearch;
    });
  }, [drivers, searchQuery]);

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
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {(() => {
                        const avatarSrc = driverProfileImageSrc(driver.profile_image);
                        return avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : null;
                      })()}
                      <div className="min-w-0">
                        <div className="truncate">{driver.name || '—'}</div>
                        <DriverVehicleClassBadges classes={driver.vehicle_classes} className="mt-0.5" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">{formatPhoneDisplay(driver.phone)}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {driver.is_verified ? formatDriverVerifiedAt(driver.verified_at) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <ActionButtons
                      onEdit={() => {
                        setSelectedDriverId(driver.id);
                        setEditModalOpen(true);
                      }}
                      onDelete={() => {
                        if (driver.is_verified) {
                          setAlertType('warning');
                          setAlertTitle('Cannot delete driver');
                          setAlertMessage(
                            `Driver with licence "${driver.license_number}" is verified and cannot be deleted.`,
                          );
                          setAlertOpen(true);
                          return;
                        }
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
        description={`Delete driver with licence “${selectedDriver?.license_number}”? This cannot be undone.`}
        confirmText={deleting ? 'Deleting…' : 'Delete'}
        onConfirm={() => {
          if (selectedDriver?.is_verified) {
            setAlertType('warning');
            setAlertTitle('Cannot delete driver');
            setAlertMessage(
              `Driver with licence "${selectedDriver.license_number}" is verified and cannot be deleted.`,
            );
            setAlertOpen(true);
            setDeleteDialogOpen(false);
            return;
          }
          void handleDelete();
        }}
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
