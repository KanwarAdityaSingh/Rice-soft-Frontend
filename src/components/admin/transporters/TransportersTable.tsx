import { useState, useMemo } from 'react';
import { SearchBar } from '../shared/SearchBar';
import { FilterDropdown } from '../shared/FilterDropdown';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { ActionButtons } from '../shared/ActionButtons';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Truck } from 'lucide-react';
import { useTransporters } from '../../../hooks/useTransporters';
import { TransporterFormModal } from './TransporterFormModal';
import type { Transporter } from '../../../types/entities';

export function TransportersTable() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const { transporters, loading, deleteTransporter, refetch } = useTransporters(includeInactive);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransporter, setSelectedTransporter] = useState<Transporter | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const filtered = useMemo(() => {
    return transporters.filter((transporter) => {
      const matchesSearch = 
        transporter.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transporter.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transporter.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (transporter.email && transporter.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter 
        ? (statusFilter === 'active' ? transporter.is_active : !transporter.is_active)
        : true;

      return matchesSearch && matchesStatus;
    });
  }, [transporters, searchQuery, statusFilter]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder="Search by business name, contact, phone, or email..." 
          />
        </div>
        <div className="flex gap-2">
          <FilterDropdown
            label="Status"
            options={[
              { label: 'All', value: undefined },
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 px-4 py-2"
          >
            Add Transporter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No transporters found"
          description="Create your first transporter or adjust filters."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Business Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Contact Person</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">City</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Vehicles</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((transporter) => (
                  <tr key={transporter.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium">{transporter.business_name}</td>
                    <td className="py-3 px-4 text-sm">{transporter.contact_person}</td>
                    <td className="py-3 px-4 text-sm">{transporter.phone}</td>
                    <td className="py-3 px-4 text-sm">{transporter.email || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm">{transporter.address.city}</td>
                    <td className="py-3 px-4 text-sm">
                      {transporter.vehicle_numbers.length > 0 
                        ? `${transporter.vehicle_numbers.length} vehicle(s)`
                        : 'None'
                      }
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ActionButtons
                        isActive={transporter.is_active}
                        onEdit={() => {
                          setSelectedTransporterId(transporter.id);
                          setEditModalOpen(true);
                        }}
                        onDelete={() => {
                          setSelectedTransporter(transporter);
                          setDeleteDialogOpen(true);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ConfirmDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={async () => {
              if (selectedTransporter) {
                await deleteTransporter(selectedTransporter.id);
                setDeleteDialogOpen(false);
                setSelectedTransporter(null);
              }
            }}
            title="Delete Transporter"
            description={`Are you sure you want to delete "${selectedTransporter?.business_name}"? This action cannot be undone.`}
            confirmText="Delete"
          />

          <TransporterFormModal
            open={createModalOpen}
            onOpenChange={(open) => {
              setCreateModalOpen(open);
              if (!open) {
                refetch();
              }
            }}
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
        </>
      )}
    </div>
  );
}

