import { useMemo, useState, useEffect } from 'react';
import { Store, Plus, Mail, Phone, MapPin, CreditCard, FileText, Calendar, UserCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../../components/admin/shared/SearchBar';
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner';
import { EmptyState } from '../../components/admin/shared/EmptyState';
import { ActionButtons } from '../../components/admin/shared/ActionButtons';
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog';
import { AlertDialog } from '../../components/shared/AlertDialog';
import { useSalesParties } from '../../hooks/useSalesParties';
import { SalesPartyFormModal } from '../../components/admin/sales-parties/SalesPartyFormModal';
import { PartySiteFormModal } from '../../components/admin/shared/PartySiteFormModal';
import { PartySitesDialog } from '../../components/admin/shared/PartySitesDialog';
import { leadsAPI } from '../../services/leads.api';
import { salesSaudasAPI } from '../../services/salesSaudas.api';
import { isAdmin } from '../../utils/permissions';
import type { Lead } from '../../types/entities';

export default function SalesPartiesPage() {
  const { salesParties, loading, deleteSalesParty, refetch } = useSalesParties();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSalesPartyId, setSelectedSalesPartyId] = useState<string | null>(null);
  const [leadDetails, setLeadDetails] = useState<Record<string, Lead>>({});
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [addSiteCtx, setAddSiteCtx] = useState<{ id: string; name: string } | null>(null);
  const [viewSitesCtx, setViewSitesCtx] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    return salesParties.filter((s) => {
      const q = searchQuery.toLowerCase();
      const primaryContact = s.contact_persons?.[0];
      const matchesSearch =
        s.business_name.toLowerCase().includes(q) ||
        (primaryContact?.name || '').toLowerCase().includes(q) ||
        (primaryContact?.emails?.[0] || '').toLowerCase().includes(q) ||
        (primaryContact?.phones?.[0] || '').includes(searchQuery);
      return matchesSearch;
    });
  }, [salesParties, searchQuery]);

  useEffect(() => {
    const fetchLeadDetails = async () => {
      const withLeads = filtered.filter((s) => s.lead_id);
      const leadIds = withLeads.map((s) => s.lead_id!).filter((id, i, self) => self.indexOf(id) === i);
      const newLeadDetails: Record<string, Lead> = {};
      await Promise.all(
        leadIds.map(async (leadId) => {
          if (!leadDetails[leadId]) {
            try {
              const lead = await leadsAPI.getLeadById(leadId);
              newLeadDetails[leadId] = lead;
            } catch {
              // ignore
            }
          }
        })
      );
      if (Object.keys(newLeadDetails).length > 0) {
        setLeadDetails((prev) => ({ ...prev, ...newLeadDetails }));
      }
    };
    if (filtered.length > 0) fetchLeadDetails();
  }, [filtered]);

  const parseSalesPartyForeignKeyError = async (error: any, salesPartyId: string): Promise<string | null> => {
    const errorMessage = error?.data?.error || error?.error || error?.message || '';
    if (!errorMessage || !errorMessage.includes('violates foreign key constraint')) return null;
    if (errorMessage.includes('sales_saudas') || errorMessage.includes('sales_party_id')) {
      try {
        const saudas = await salesSaudasAPI.list({ sales_party_id: salesPartyId });
        if (saudas.length > 0) {
          const count = saudas.length;
          const saudaText = count === 1 ? 'sales sauda' : 'sales saudas';
          return `This sales party cannot be deleted because it is used in ${count} ${saudaText}. Remove or reassign them first.`;
        }
      } catch {
        // ignore
      }
    }
    return 'This sales party cannot be deleted because it is being used by other records. Remove all references first.';
  };

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      <header className="hero-bg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            <span className="text-gradient">Sales Party Directory</span>
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
            Find and manage customers for sales saudas
          </p>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="w-full min-w-0 flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by business, contact, email, or phone..."
          />
        </div>
        {isAdmin() && (
          <button
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto shrink-0"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Add Sales Party
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No sales parties found"
          description="Create your first sales party or try a different search."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <article
              key={s.id}
              className="group rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">{s.business_name.trim()}</h3>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {s.address.city.trim()}
                    </div>
                  </div>
                </div>
                <span
                  className={`whitespace-nowrap px-2 py-1 rounded-md text-[10px] ${
                    s.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs">
                {s.contact_persons?.[0] && (
                  <>
                    <div className="inline-flex items-center gap-2 text-foreground/90">
                      <span className="text-muted-foreground w-16">Contact</span>
                      <span className="font-medium">{s.contact_persons[0].name?.trim() || 'N/A'}</span>
                    </div>
                    {s.contact_persons[0].emails?.[0] && (
                      <div className="inline-flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{s.contact_persons[0].emails[0].trim()}</span>
                      </div>
                    )}
                    {s.contact_persons[0].phones?.[0] && (
                      <div className="inline-flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{s.contact_persons[0].phones[0].trim()}</span>
                      </div>
                    )}
                  </>
                )}
                {s.address?.street && (
                  <div className="inline-flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{s.address.street.trim()}</span>
                  </div>
                )}
                {(s.address?.city || s.address?.state || s.address?.pincode) && (
                  <div className="inline-flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground opacity-0" />
                    <span className="truncate">
                      {[s.address.city, s.address.state, s.address.pincode].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {s.business_details?.gst_number && (
                  <div className="inline-flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">GST: {s.business_details.gst_number}</span>
                  </div>
                )}
                {s.business_details?.pan_number && (
                  <div className="inline-flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">PAN: {s.business_details.pan_number}</span>
                  </div>
                )}
                {s.bank_details?.account_holder_name && (
                  <div className="inline-flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">A/C: {s.bank_details.account_holder_name}</span>
                  </div>
                )}
                {s.last_enquiry_date && (
                  <div className="inline-flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Last Enquiry: {new Date(s.last_enquiry_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {s.lead_id && leadDetails[s.lead_id] && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="inline-flex items-center gap-2 text-primary">
                      <UserCircle className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">Lead Info</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/crm/leads/${s.lead_id}`);
                      }}
                      className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors"
                    >
                      View Lead <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="grid gap-1.5 text-xs">
                    {leadDetails[s.lead_id].company_name && (
                      <div className="inline-flex items-center gap-2">
                        <span className="text-muted-foreground w-16">Company</span>
                        <span className="font-medium">{leadDetails[s.lead_id].company_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isAdmin() && (
                <div className="mt-3 flex items-center justify-end">
                  <ActionButtons
                    isActive={s.is_active}
                    onAddSite={() => setAddSiteCtx({ id: s.id, name: s.business_name })}
                    onViewSites={() => setViewSitesCtx({ id: s.id, name: s.business_name })}
                    onEdit={() => {
                      setSelectedSalesPartyId(s.id);
                      setEditModalOpen(true);
                    }}
                    onDelete={() => {
                      setSelectedId(s.id);
                      setDeleteDialogOpen(true);
                    }}
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedId) {
            try {
              await deleteSalesParty(selectedId);
              setSelectedId(null);
              setDeleteDialogOpen(false);
            } catch (error: any) {
              const friendlyMessage = await parseSalesPartyForeignKeyError(error, selectedId);
              if (friendlyMessage) {
                setAlertType('error');
                setAlertTitle('Cannot Delete Sales Party');
                setAlertMessage(friendlyMessage);
                setAlertOpen(true);
              } else {
                setAlertType('error');
                setAlertTitle('Failed to Delete Sales Party');
                setAlertMessage(
                  error?.message ||
                    error?.data?.message ||
                    error?.error ||
                    'An error occurred while deleting the sales party. Please try again.'
                );
                setAlertOpen(true);
              }
              setDeleteDialogOpen(false);
            }
          }
        }}
        title="Delete Sales Party"
        description="Are you sure you want to delete this sales party? This action cannot be undone."
        confirmText="Delete"
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />

      <SalesPartyFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) refetch();
        }}
      />

      <SalesPartyFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedSalesPartyId(null);
            refetch();
          }
        }}
        salesPartyId={selectedSalesPartyId}
      />

      <PartySiteFormModal
        open={addSiteCtx !== null}
        onOpenChange={(open) => {
          if (!open) setAddSiteCtx(null);
        }}
        kind="sales_party"
        partyId={addSiteCtx?.id ?? ''}
        partyName={addSiteCtx?.name}
        onSaved={() => refetch()}
      />

      <PartySitesDialog
        open={viewSitesCtx !== null}
        onOpenChange={(open) => {
          if (!open) setViewSitesCtx(null);
        }}
        kind="sales_party"
        partyId={viewSitesCtx?.id ?? ''}
        partyName={viewSitesCtx?.name ?? ''}
      />
    </div>
  );
}
