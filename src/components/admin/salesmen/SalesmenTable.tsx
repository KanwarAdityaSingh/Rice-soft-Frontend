import { useState } from 'react';
import { SearchBar } from '../shared/SearchBar';
import { FilterDropdown } from '../shared/FilterDropdown';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { ActionButtons } from '../shared/ActionButtons';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Briefcase } from 'lucide-react';
import { useSalesmen } from '../../../hooks/useSalesmen';

export function SalesmenTable() {
  const { salesmen, loading, deleteSalesman } = useSalesmen();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSalesman, setSelectedSalesman] = useState<{ id: string; name?: string } | null>(null);

  const filteredSalesmen = salesmen.filter((salesman) => {
    const matchesSearch = 
      salesman.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      salesman.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      salesman.phone.includes(searchQuery);
    
    const matchesStatus = statusFilter ? (statusFilter === 'active' ? salesman.is_active : !salesman.is_active) : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Filters Section - Responsive */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by name, email, or phone..." />
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
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filteredSalesmen.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No salesmen found"
          description="Get started by creating a new salesman or adjust your filters."
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Phone</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalesmen.map((salesman) => (
                  <tr key={salesman.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-sm">{salesman.name}</td>
                    <td className="py-3 px-4 text-sm">{salesman.email}</td>
                    <td className="py-3 px-4 text-sm">{salesman.phone}</td>
                    <td className="py-3 px-4 text-right">
                      <ActionButtons
                        isActive={salesman.is_active}
                        onEdit={() => console.log('Edit', salesman.id)}
                        onDelete={() => {
                          setSelectedSalesman(salesman);
                          setDeleteDialogOpen(true);
                        }}
                        permissionEntity="salesman"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredSalesmen.map((salesman) => (
              <div
                key={salesman.id}
                className="card-glow rounded-xl p-4 space-y-3 hover:shadow-lg transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{salesman.name}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs whitespace-nowrap ${
                    salesman.is_active 
                      ? 'bg-emerald-500/10 text-emerald-600' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {salesman.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Email</span>
                    <p className="truncate">{salesman.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Phone</span>
                    <p className="truncate">{salesman.phone}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <ActionButtons
                    isActive={salesman.is_active}
                    onEdit={() => console.log('Edit', salesman.id)}
                    onDelete={() => {
                      setSelectedSalesman(salesman);
                      setDeleteDialogOpen(true);
                    }}
                    permissionEntity="salesman"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {filteredSalesmen.length} of {salesmen.length} salesmen</span>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedSalesman) {
            await deleteSalesman(selectedSalesman.id);
            setDeleteDialogOpen(false);
            setSelectedSalesman(null);
          }
        }}
        title="Delete Salesman"
        description={`Are you sure you want to delete ${selectedSalesman?.name}? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}

