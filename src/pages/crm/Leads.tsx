import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useLeads } from '../../hooks/useLeads';
import { useLeadEvents } from '../../hooks/useLeadEvents';
import { useAuth } from '../../hooks/useAuth';
import { LeadFormModal } from '../../components/crm/leads/LeadFormModal';
import { LeadProgressModal } from '../../components/crm/leads/LeadProgressModal';
import { LeadsTable } from '../../components/crm/leads/LeadsTable';
import type { Lead, LeadFilters } from '../../types/entities';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { leadsAPI } from '../../services/leads.api';

export default function LeadsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<LeadFilters>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const { leads, loading, createLead, updateLead, deleteLead, refetch } = useLeads(filters);
  const { events, refetch: refetchEvents } = useLeadEvents(selectedLead?.id || null);

  // Filter leads based on user role and permissions
  const filteredLeads = useMemo(() => {
    if (!user) return [];
    
    // Admin users can see all leads
    if (user.user_type === 'admin') {
      return leads;
    }
    
    // Non-admin users can only see leads they created or are assigned to
    return leads.filter(lead => 
      lead.created_by === user.id || lead.assigned_to === user.id
    );
  }, [leads, user]);

  // Open edit modal if ?edit={id} is present
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || !user) return;

    const existing = filteredLeads.find((l) => l.id === editId) || null;
    if (existing) {
      setEditingLead(existing);
      setModalOpen(true);
    } else {
      // Fetch lead by id if not in current list
      (async () => {
        try {
          const lead = await leadsAPI.getLeadById(editId);
          
          // Check if user has permission to view this lead
          const hasPermission = user.user_type === 'admin' || 
                                lead.created_by === user.id || 
                                lead.assigned_to === user.id;
          
          if (hasPermission) {
            setEditingLead(lead);
            setModalOpen(true);
          } else {
            // User doesn't have permission to view this lead
            const next = new URLSearchParams(searchParams);
            next.delete('edit');
            setSearchParams(next, { replace: true });
          }
        } catch {
          // silently ignore
          // remove invalid edit param
          const next = new URLSearchParams(searchParams);
          next.delete('edit');
          setSearchParams(next, { replace: true });
        }
      })();
    }
  }, [searchParams, filteredLeads, user]);

  const handleSave = async (data: any) => {
    try {
      if (editingLead) {
        await updateLead(editingLead.id, data);
        setEditingLead(null);
      } else {
        await createLead(data);
        // refetch is already called inside createLead, but we can call it again to be safe
        await refetch();
      }
      setModalOpen(false);
    } catch (error) {
      console.error('Failed to save lead:', error);
    }
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setModalOpen(true);
  };

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      <header className="hero-bg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold"><span className="text-gradient">Lead Management</span></h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">Manage prospects and track your sales pipeline</p>
        </div>
      </header>

      <div className="flex items-center justify-end">
        <button
          onClick={() => {
            setEditingLead(null);
            setModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" />
          Create Lead
        </button>
      </div>

      <div className="card-glow rounded-xl sm:rounded-2xl p-4 sm:p-6 highlight-box">
        {user && (
          <>
            {user.user_type !== 'admin' && (
              <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-primary">Note:</span> You are viewing leads that you created or are assigned to you.
                </p>
              </div>
            )}
            <LeadsTable
              leads={filteredLeads}
              loading={loading}
              deleteLead={deleteLead}
              filters={filters}
              onFiltersChange={setFilters}
              onEdit={handleEdit}
              onViewProgress={(lead) => {
                setSelectedLead(lead);
                setProgressModalOpen(true);
                refetchEvents();
              }}
            />
          </>
        )}
      </div>

      <LeadFormModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setEditingLead(null);
            const next = new URLSearchParams(searchParams);
            if (next.has('edit')) {
              next.delete('edit');
              setSearchParams(next, { replace: true });
            }
          }
        }}
        onSave={async (data) => {
          await handleSave(data);
          const next = new URLSearchParams(searchParams);
          if (next.has('edit')) {
            next.delete('edit');
            setSearchParams(next, { replace: true });
          }
        }}
        lead={editingLead}
      />

      {selectedLead && (
        <LeadProgressModal
          open={progressModalOpen}
          onOpenChange={setProgressModalOpen}
          lead={selectedLead}
          events={events}
        />
      )}
    </div>
  );
}
