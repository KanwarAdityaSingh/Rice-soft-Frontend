import { useState } from 'react';
import { SearchBar } from '../shared/SearchBar';
import { FilterDropdown } from '../shared/FilterDropdown';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { EmptyState } from '../shared/EmptyState';
import { ActionButtons } from '../shared/ActionButtons';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Store } from 'lucide-react';
import { useVendors } from '../../../hooks/useVendors';
import { VendorFormModal } from './VendorFormModal';

export function VendorsTable() {
  const { vendors, loading, deleteVendor, refetch } = useVendors();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<{ id: string; business_name?: string } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch = 
      vendor.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter ? (statusFilter === 'active' ? vendor.is_active : !vendor.is_active) : true;
    const matchesType = typeFilter ? vendor.type === typeFilter : true;

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
            { label: 'Purchaser', value: 'purchaser' },
            { label: 'Seller', value: 'seller' },
            { label: 'Both', value: 'both' },
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filteredVendors.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No vendors found"
          description="Get started by creating a new vendor or adjust your filters."
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
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium">{vendor.business_name}</td>
                    <td className="py-3 px-4 text-sm">{vendor.contact_person}</td>
                    <td className="py-3 px-4 text-sm">{vendor.email}</td>
                    <td className="py-3 px-4 text-sm">{vendor.phone}</td>
                    <td className="py-3 px-4 text-sm capitalize">{vendor.type}</td>
                    <td className="py-3 px-4 text-sm">{vendor.address.city}</td>
                    <td className="py-3 px-4 text-right">
                      <ActionButtons
                        isActive={vendor.is_active}
                        onEdit={() => {
                          setSelectedVendorId(vendor.id);
                          setEditModalOpen(true);
                        }}
                        onDelete={() => {
                          setSelectedVendor(vendor);
                          setDeleteDialogOpen(true);
                        }}
                        permissionEntity="vendor"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {filteredVendors.length} of {vendors.length} vendors</span>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedVendor) {
            await deleteVendor(selectedVendor.id);
            setDeleteDialogOpen(false);
            setSelectedVendor(null);
          }
        }}
        title="Delete Vendor"
        description={`Are you sure you want to delete ${selectedVendor?.business_name}? This action cannot be undone.`}
        confirmText="Delete"
      />

      <VendorFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedVendorId(null);
            refetch();
          }
        }}
        vendorId={selectedVendorId}
      />
    </div>
  );
}

