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
      {/* Filters Section - Responsive */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by business name, contact, or email..." />
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
              { label: 'Purchase', value: 'purchase' },
              { label: 'Sale', value: 'sale' },
              { label: 'Both', value: 'both' },
            ]}
            value={typeFilter}
            onChange={setTypeFilter}
          />
        </div>
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
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
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

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredBrokers.map((broker) => (
              <div
                key={broker.id}
                className="card-glow rounded-xl p-4 space-y-3 hover:shadow-lg transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{broker.business_name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{broker.contact_person}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs whitespace-nowrap ${
                    broker.is_active 
                      ? 'bg-emerald-500/10 text-emerald-600' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {broker.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Email</span>
                    <p className="truncate">{broker.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Phone</span>
                    <p className="truncate">{broker.phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Type</span>
                    <p className="capitalize">{broker.type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">City</span>
                    <p className="truncate">{broker.address.city}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <ActionButtons
                    isActive={broker.is_active}
                    onEdit={() => console.log('Edit', broker.id)}
                    onDelete={() => {
                      setSelectedBroker(broker);
                      setDeleteDialogOpen(true);
                    }}
                  />
                </div>
              </div>
            ))}
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

