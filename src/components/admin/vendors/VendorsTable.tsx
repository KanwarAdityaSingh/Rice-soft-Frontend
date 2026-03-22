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
  const [bankVerifyFilter, setBankVerifyFilter] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<{ id: string; business_name?: string } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'purchaser': return 'Debtor';
      case 'seller': return 'Creditor';
      case 'both': return 'Both';
      default: return type;
    }
  };

  const filteredVendors = vendors.filter((vendor) => {
    const primaryContact = vendor.contact_persons?.[0];
    const matchesSearch = 
      vendor.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (primaryContact?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (primaryContact?.emails?.[0] || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter ? (statusFilter === 'active' ? vendor.is_active : !vendor.is_active) : true;
    const matchesType = typeFilter ? vendor.type === typeFilter : true;
    const verified = Boolean(vendor.bank_details_verified_at);
    const matchesBank =
      bankVerifyFilter === 'verified' ? verified : bankVerifyFilter === 'unverified' ? !verified : true;

    return matchesSearch && matchesStatus && matchesType && matchesBank;
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
            { label: 'Debtor', value: 'purchaser' },
            { label: 'Creditor', value: 'seller' },
            { label: 'Both', value: 'both' },
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
        />
        <FilterDropdown
          label="Bank"
          options={[
            { label: 'Verified', value: 'verified' },
            { label: 'Not verified', value: 'unverified' },
          ]}
          value={bankVerifyFilter}
          onChange={setBankVerifyFilter}
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
                  <th className="text-left py-3 px-4 text-sm font-semibold">Bank</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">City</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium">{vendor.business_name}</td>
                    <td className="py-3 px-4 text-sm">{vendor.contact_persons?.[0]?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm">{vendor.contact_persons?.[0]?.emails?.[0] || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm">{vendor.contact_persons?.[0]?.phones?.[0] || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm">{getTypeLabel(vendor.type)}</td>
                    <td className="py-3 px-4 text-sm max-w-[14rem]">
                      {vendor.bank_details_verified_at ? (
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/25">
                          Verified
                        </span>
                      ) : vendor.bank_verification_error?.trim() ? (
                        <span
                          className="inline-flex items-start gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/25"
                          title={vendor.bank_verification_error.trim()}
                        >
                          <span className="line-clamp-2">{vendor.bank_verification_error.trim()}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
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

