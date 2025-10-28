import { useState } from 'react';
import { SearchBar } from '../shared/SearchBar';
import { FilterDropdown } from '../shared/FilterDropdown';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { ActionButtons } from '../shared/ActionButtons';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { UserCircle } from 'lucide-react';
import { useBrokers } from '../../../hooks/useBrokers';

export function BrokersTable() {
  const { brokers, loading, deleteBroker } = useBrokers();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<{ id: string; business_name?: string } | null>(null);

  const filteredBrokers = brokers.filter((broker) => {
    const matchesSearch = 
      broker.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      broker.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      broker.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter ? (statusFilter === 'active' ? broker.is_active : !broker.is_active) : true;
    const matchesType = typeFilter ? broker.type === typeFilter : true;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by business name, contact, or email..." />
        </div>
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
            { label: 'Purchase', value: 'purchase' },
            { label: 'Sale', value: 'sale' },
            { label: 'Both', value: 'both' },
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filteredBrokers.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title="No brokers found"
          description="Get started by creating a new broker or adjust your filters."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Business Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Contact Person</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">City</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBrokers.map((broker) => (
                  <tr key={broker.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium">{broker.business_name}</td>
                    <td className="py-3 px-4 text-sm">{broker.contact_person}</td>
                    <td className="py-3 px-4 text-sm">{broker.email}</td>
                    <td className="py-3 px-4 text-sm">{broker.phone}</td>
                    <td className="py-3 px-4 text-sm capitalize">{broker.type}</td>
                    <td className="py-3 px-4 text-sm">{broker.address.city}</td>
                    <td className="py-3 px-4 text-right">
                      <ActionButtons
                        isActive={broker.is_active}
                        onEdit={() => console.log('Edit', broker.id)}
                        onDelete={() => {
                          setSelectedBroker(broker);
                          setDeleteDialogOpen(true);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {filteredBrokers.length} of {brokers.length} brokers</span>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedBroker) {
            await deleteBroker(selectedBroker.id);
            setDeleteDialogOpen(false);
            setSelectedBroker(null);
          }
        }}
        title="Delete Broker"
        description={`Are you sure you want to delete ${selectedBroker?.business_name}? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}

