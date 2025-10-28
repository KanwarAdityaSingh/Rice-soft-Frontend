import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { SearchBar } from '../../admin/shared/SearchBar';
import { FilterDropdown } from '../../admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { LeadStatusBadge } from '../../admin/shared/LeadStatusBadge';
import { LeadPriorityBadge } from '../../admin/shared/LeadPriorityBadge';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { Users, Edit, Trash2, TrendingUp } from 'lucide-react';
import type { Lead, LeadFilters, LeadEvent } from '../../../types/entities';

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

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

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
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <SearchBar 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder="Search by company name, contact, or email..." 
          />
        </div>
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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-semibold">Company Name</th>
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
                    <button
                      onClick={() => onEdit(lead)}
                      className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(lead)}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

