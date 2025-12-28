import { useState, useMemo } from 'react';
import { Plus, Store, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { SearchBar } from '../../admin/shared/SearchBar';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ActionButtons } from '../../admin/shared/ActionButtons';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { usePackagingVendors } from '../../../hooks/usePackagingVendors';
import { PackagingVendorFormModal } from './PackagingVendorFormModal';

export function PackagingVendorsTable() {
  const { packagingVendors, loading, deletePackagingVendor, refetch } = usePackagingVendors();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<{ id: string; name?: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!searchQuery) return packagingVendors;
    
    const q = searchQuery.toLowerCase();
    return packagingVendors.filter((v) => {
      const contactNames = v.contact_persons?.map(cp => cp.name || '').join(' ') || '';
      const phones = v.contact_persons?.flatMap(cp => cp.phones || []).join(' ') || '';
      const emails = v.contact_persons?.flatMap(cp => cp.emails || []).join(' ') || '';
      const addressStr = v.address ? `${v.address.street} ${v.address.city} ${v.address.state} ${v.address.pincode}`.toLowerCase() : '';
      
      return (
        v.name.toLowerCase().includes(q) ||
        contactNames.toLowerCase().includes(q) ||
        emails.toLowerCase().includes(q) ||
        phones.includes(q) ||
        (v.gst_number || '').toLowerCase().includes(q) ||
        addressStr.includes(q)
      );
    });
  }, [packagingVendors, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search packaging vendors..."
          />
        </div>
        <button
          className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" /> Create Vendor
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No packaging vendors found"
          description="Create your first packaging vendor to get started."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Vendor Name
                  </th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contact Person
                  </th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Address
                  </th>
                  <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    GST Number
                  </th>
                  <th className="text-right py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((vendor) => (
                  <tr key={vendor.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Store className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{vendor.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-sm text-foreground">
                      {vendor.contact_persons && vendor.contact_persons.length > 0 ? (
                        <div className="space-y-1">
                          {vendor.contact_persons.map((cp, idx) => (
                            <div key={idx} className="font-medium">
                              {cp.name || 'N/A'}
                            </div>
                          ))}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="py-4 px-5">
                      {vendor.contact_persons && vendor.contact_persons.length > 0 ? (
                        <div className="space-y-2">
                          {vendor.contact_persons.map((cp, cpIdx) => (
                            <div key={cpIdx} className="space-y-1">
                              {cp.phones && cp.phones.length > 0 && (
                                <div className="space-y-1">
                                  {cp.phones.map((phone, phoneIdx) => (
                                    phone && (
                                      <div key={phoneIdx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Phone className="h-3.5 w-3.5" />
                                        <span>{phone}</span>
                                      </div>
                                    )
                                  ))}
                                </div>
                              )}
                              {cp.emails && cp.emails.length > 0 && (
                                <div className="space-y-1">
                                  {cp.emails.map((email, emailIdx) => (
                                    email && (
                                      <div key={emailIdx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5" />
                                        <span>{email}</span>
                                      </div>
                                    )
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      {vendor.address ? (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <div className="line-clamp-2">
                            {[vendor.address.street, vendor.address.city, vendor.address.state, vendor.address.pincode]
                              .filter(Boolean)
                              .join(', ')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      {vendor.gst_number ? (
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-foreground">{vendor.gst_number}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <ActionButtons
                        isActive={true}
                        onEdit={() => {
                          setEditId(vendor.id);
                        }}
                        onDelete={() => {
                          setSelectedVendor({ id: vendor.id, name: vendor.name });
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
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedVendor) {
            await deletePackagingVendor(selectedVendor.id);
            setDeleteDialogOpen(false);
            setSelectedVendor(null);
            refetch();
          }
        }}
        title="Delete Packaging Vendor"
        description={`Are you sure you want to delete ${selectedVendor?.name}? This action cannot be undone.`}
        confirmText="Delete"
      />

      <PackagingVendorFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            refetch();
          }
        }}
      />

      <PackagingVendorFormModal
        open={!!editId}
        onOpenChange={(open) => {
          if (!open) {
            setEditId(null);
            refetch();
          }
        }}
        vendorId={editId}
      />
    </div>
  );
}

