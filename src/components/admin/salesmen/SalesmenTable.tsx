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
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
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
          <div className="overflow-x-auto">
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
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

