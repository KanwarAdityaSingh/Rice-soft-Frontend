import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, ArrowRight, Plus } from 'lucide-react';
import { leadsAPI } from '../../services/leads.api';
import { useLeadEvents } from '../../hooks/useLeadEvents';
import { LeadStatusBadge } from '../../components/admin/shared/LeadStatusBadge';
import { LeadPriorityBadge } from '../../components/admin/shared/LeadPriorityBadge';
import { LeadInfoCards } from '../../components/crm/leads/LeadInfoCards';
import { LeadEventsTimeline } from '../../components/crm/leads/LeadEventsTimeline';
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner';
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog';
import { ConversionDialog } from '../../components/crm/leads/ConversionDialog';
import { AddEventDialog } from '../../components/crm/leads/AddEventDialog';
import type { Lead } from '../../types/entities';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversionOpen, setConversionOpen] = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);

  const { events, refetch: refetchEvents } = useLeadEvents(id || null);

  useEffect(() => {
    const fetchLead = async () => {
      if (!id) return;
      try {
        const data = await leadsAPI.getLeadById(id);
        setLead(data);
      } catch (error) {
        console.error('Failed to fetch lead:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLead();
  }, [id]);

  const refetchLead = async () => {
    if (!id) return;
    try {
      const data = await leadsAPI.getLeadById(id);
      setLead(data);
    } catch (error) {
      // no-op
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await leadsAPI.deleteLead(id);
      navigate('/crm/leads');
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="container mx-auto py-8">
        <p>Lead not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/crm/leads')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Leads
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient">{lead.company_name}</h1>
            <p className="mt-2 text-muted-foreground">{lead.contact_person}</p>
          </div>
          <div className="flex items-center gap-3">
            <LeadStatusBadge status={lead.lead_status} />
            <LeadPriorityBadge priority={lead.priority} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => navigate(`/crm/leads?edit=${lead.id}`)}
            className="btn-secondary flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => setDeleteDialogOpen(true)}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          {lead.lead_status !== 'converted' && (
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => setConversionOpen(true)}
            >
              Convert to Vendor
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="mb-8">
        <LeadInfoCards lead={lead} />
      </div>

      {/* Events Timeline */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Activity Timeline</h2>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setAddEventOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Event
          </button>
        </div>
        <LeadEventsTimeline events={events} />
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Lead"
        description={`Are you sure you want to delete ${lead.company_name}? This action cannot be undone.`}
        confirmText="Delete"
      />

      {lead && (
        <ConversionDialog
          open={conversionOpen}
          onOpenChange={setConversionOpen}
          lead={lead}
          onSuccess={async () => {
            await refetchLead();
            await refetchEvents();
          }}
        />
      )}

      {lead && (
        <AddEventDialog
          open={addEventOpen}
          onOpenChange={setAddEventOpen}
          leadId={lead.id}
          onSuccess={async () => {
            await refetchEvents();
          }}
        />
      )}
    </div>
  );
}
