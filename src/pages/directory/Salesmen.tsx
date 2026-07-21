import { useMemo, useState } from 'react';
import { UserCheck, Plus, Mail, Phone, Shield, Briefcase } from 'lucide-react';
import { SearchBar } from '../../components/admin/shared/SearchBar';
import { FilterDropdown } from '../../components/admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../components/admin/shared/LoadingSpinner';
import { EmptyState } from '../../components/admin/shared/EmptyState';
import { ActionButtons } from '../../components/admin/shared/ActionButtons';
import { ConfirmDialog } from '../../components/admin/shared/ConfirmDialog';
import { useSalesmen } from '../../hooks/useSalesmen';
import { SalesmanFormModal } from '../../components/admin/salesmen/SalesmanFormModal';
import { formatPhoneDisplay } from '../../utils/validation';
import type { Salesman } from '../../types/entities';

export default function SalesmenPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>('active');
  const { salesmen, loading, deleteSalesman, refetch } = useSalesmen({
    includeInactive: statusFilter !== 'active',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState<Salesman | null>(null);

  const filtered = useMemo(() => {
    return salesmen.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.salesperson_code || '').toLowerCase().includes(q) ||
        (s.designation || '').toLowerCase().includes(q) ||
        s.phone.includes(searchQuery) ||
        formatPhoneDisplay(s.phone).includes(searchQuery);

      const matchesStatus = statusFilter
        ? statusFilter === 'active'
          ? s.is_active
          : !s.is_active
        : true;

      return matchesSearch && matchesStatus;
    });
  }, [salesmen, searchQuery, statusFilter]);

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      <header className="hero-bg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            <span className="text-gradient">Salesperson Directory</span>
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
            Salesperson master — personal, KYC, bank, and salary
          </p>
        </div>
      </header>

      <div className="space-y-3">
        <div className="w-full">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, code, designation, email, or phone..."
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1">
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
          <button
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            onClick={() => {
              setEditingSalesman(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add Salesperson
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No salesperson found"
          description="Create your first salesperson or adjust filters."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <article
              key={s.id}
              className="group rounded-2xl p-4 bg-gradient-to-br from-background to-muted/40 border border-border/60 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    {s.salesperson_code && (
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground tabular-nums">
                        {s.salesperson_code}
                      </div>
                    )}
                    <h3 className="text-sm font-semibold leading-tight flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{s.name.trim()}</span>
                      {s.is_verified && (
                        <Shield
                          className="h-3.5 w-3.5 text-emerald-500 shrink-0"
                          aria-label="KYC verified"
                        />
                      )}
                    </h3>
                    {s.designation && (
                      <div className="text-xs text-muted-foreground truncate">{s.designation}</div>
                    )}
                  </div>
                </div>
                <span
                  className={`whitespace-nowrap px-2 py-1 rounded-md text-[10px] shrink-0 ${
                    s.is_active
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs">
                <div className="inline-flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{formatPhoneDisplay(s.phone)}</span>
                </div>
                {s.email?.trim() && (
                  <div className="inline-flex items-center gap-2 min-w-0">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{s.email.trim()}</span>
                  </div>
                )}
                {s.basic_salary != null && (
                  <div className="inline-flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>
                      ₹{Number(s.basic_salary).toLocaleString('en-IN')}
                      {s.salary_effective_from ? ` · from ${s.salary_effective_from}` : ''}
                    </span>
                  </div>
                )}
                {s.bank_details_verified_at && (
                  <div className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                    <Shield className="h-3 w-3" />
                    Bank verified
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-end">
                <ActionButtons
                  isActive={s.is_active}
                  permissionEntity="salesman"
                  onEdit={() => {
                    setEditingSalesman(s);
                    setCreateOpen(true);
                  }}
                  onDelete={() => {
                    setSelectedId(s.id);
                    setDeleteDialogOpen(true);
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedId) {
            await deleteSalesman(selectedId);
            setSelectedId(null);
            setDeleteDialogOpen(false);
          }
        }}
        title="Delete Salesperson"
        description="Are you sure you want to delete this salesperson? This action cannot be undone."
        confirmText="Delete"
      />

      <SalesmanFormModal
        open={createOpen}
        editingSalesman={editingSalesman}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setEditingSalesman(null);
            refetch();
          }
        }}
      />
    </div>
  );
}
