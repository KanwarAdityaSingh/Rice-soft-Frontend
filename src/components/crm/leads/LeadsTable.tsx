import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../../admin/shared/SearchBar';
import { FilterDropdown } from '../../admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { LeadStatusBadge } from '../../admin/shared/LeadStatusBadge';
import { LeadPriorityBadge } from '../../admin/shared/LeadPriorityBadge';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { Users, Edit, Trash2, TrendingUp, Copy, Check } from 'lucide-react';
import { canDelete, canUpdate, isAdmin, isCustomUser } from '../../../utils/permissions';
import type { Lead, LeadFilters } from '../../../types/entities';

interface LeadsTableProps {
  leads: Lead[];
  loading: boolean;
  deleteLead: (id: string) => Promise<void>;
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
  onEdit: (lead: Lead) => void;
  onViewProgress?: (lead: Lead) => void;
}

export function LeadsTable({ 
  leads, 
  loading, 
  deleteLead, 
  filters,
  onFiltersChange,
  onEdit,
  onViewProgress
}: LeadsTableProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.business_details?.business_keyword?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleDeleteClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedLead) {
      await deleteLead(selectedLead.id);
      setDeleteDialogOpen(false);
      setSelectedLead(null);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (filteredLeads.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No leads found"
        description="Get started by creating a new lead or adjust your filters."
      />
    );
  }

  return (
    <>
      {/* Filters Section - Responsive */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder="Search by business name, contact, email, or keyword..." 
          />
        </div>
        <div className="flex gap-2">
          <FilterDropdown
            label="Status"
            options={[
              { label: 'New', value: 'new' },
              { label: 'Contacted', value: 'contacted' },
              { label: 'Engaged', value: 'engaged' },
              { label: 'Converted', value: 'converted' },
              { label: 'Rejected', value: 'rejected' },
            ]}
            value={filters.lead_status}
            onChange={(value) => onFiltersChange({ ...filters, lead_status: value as any })}
          />
          <FilterDropdown
            label="Priority"
            options={[
              { label: 'Low', value: 'low' },
              { label: 'Medium', value: 'medium' },
              { label: 'High', value: 'high' },
              { label: 'Urgent', value: 'urgent' },
            ]}
            value={filters.priority}
            onChange={(value) => onFiltersChange({ ...filters, priority: value as any })}
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-semibold">Lead ID</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Business Name</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Contact Person</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Email</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Phone</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Priority</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">Estimated Value</th>
              <th className="text-right py-3 px-4 text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => (
              <tr 
                key={lead.id} 
                className="border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/crm/leads/${lead.id}`)}
              >
                <td className="py-3 px-4 text-sm" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{lead.id.slice(0, 8)}...</span>
                    <button
                      onClick={() => copyToClipboard(lead.id, lead.id)}
                      className="p-1 hover:bg-muted/50 rounded transition-colors"
                      title="Copy Lead ID"
                    >
                      {copiedId === lead.id ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm font-medium">{lead.company_name}</td>
                <td className="py-3 px-4 text-sm">{lead.contact_person}</td>
                <td className="py-3 px-4 text-sm">{lead.email}</td>
                <td className="py-3 px-4 text-sm">{lead.phone}</td>
                <td className="py-3 px-4 text-sm">
                  <LeadStatusBadge status={lead.lead_status} />
                </td>
                <td className="py-3 px-4 text-sm">
                  <LeadPriorityBadge priority={lead.priority} />
                </td>
                <td className="py-3 px-4 text-sm">
                  {lead.estimated_value ? `₹${lead.estimated_value.toLocaleString()}` : '-'}
                </td>
                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 justify-end">
                    {onViewProgress && (
                      <button
                        onClick={() => onViewProgress(lead)}
                        className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                        title="View Progress"
                      >
                        <TrendingUp className="h-4 w-4" />
                      </button>
                    )}
                    {((isAdmin()) || (isCustomUser() ? canUpdate('leads') : true)) && (
                      <button
                        onClick={() => onEdit(lead)}
                        className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {((isAdmin()) || (isCustomUser() ? canDelete('leads') : true)) && (
                      <button
                        onClick={() => handleDeleteClick(lead)}
                        className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {filteredLeads.map((lead) => (
          <div
            key={lead.id}
            className="card-glow rounded-xl p-4 space-y-3 hover:shadow-lg transition-all"
            onClick={() => navigate(`/crm/leads/${lead.id}`)}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">{lead.company_name}</h3>
                <p className="text-sm text-muted-foreground truncate">{lead.contact_person}</p>
              </div>
              <div className="flex gap-2">
                <LeadStatusBadge status={lead.lead_status} />
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Email</span>
                <p className="truncate">{lead.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Phone</span>
                <p className="truncate">{lead.phone}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Priority</span>
                <div className="mt-0.5">
                  <LeadPriorityBadge priority={lead.priority} />
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Value</span>
                <p className="font-medium">{lead.estimated_value ? `₹${lead.estimated_value.toLocaleString()}` : '-'}</p>
              </div>
            </div>

            {/* Lead ID */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs text-muted-foreground">ID:</span>
              <span className="font-mono text-xs text-muted-foreground">{lead.id.slice(0, 8)}...</span>
              <button
                onClick={() => copyToClipboard(lead.id, lead.id)}
                className="p-1 hover:bg-muted/50 rounded transition-colors"
                title="Copy Lead ID"
              >
                {copiedId === lead.id ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
              {onViewProgress && (
                <button
                  onClick={() => onViewProgress(lead)}
                  className="flex-1 py-2 px-3 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Progress
                </button>
              )}
              {((isAdmin()) || (isCustomUser() ? canUpdate('leads') : true)) && (
                <button
                  onClick={() => onEdit(lead)}
                  className="flex-1 py-2 px-3 bg-muted/50 rounded-lg text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              )}
              {((isAdmin()) || (isCustomUser() ? canDelete('leads') : true)) && (
                <button
                  onClick={() => handleDeleteClick(lead)}
                  className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {filteredLeads.length} of {leads.length} leads</span>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Lead"
        description={`Are you sure you want to delete ${selectedLead?.company_name}? This action cannot be undone.`}
        confirmText="Delete"
      />
    </>
  );
}

