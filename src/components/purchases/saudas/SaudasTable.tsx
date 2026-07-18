import { useState, useMemo, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { SearchBar } from '../../admin/shared/SearchBar';
import { FilterDropdown } from '../../admin/shared/FilterDropdown';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { ConfirmDialog } from '../../admin/shared/ConfirmDialog';
import { AlertDialog } from '../../shared/AlertDialog';
import { DocumentViewerModal, type DocumentInfo } from '../../shared/DocumentViewerModal';
import { Package, Eye, MoreVertical, Edit2, Trash2, UtensilsCrossed, Wheat, Mail, MessageCircle, Copy, Check, Ban, CheckCircle2, X, Link2 } from 'lucide-react';
import { useSaudas } from '../../../hooks/useSaudas';
import { useVendors } from '../../../hooks/useVendors';
import { useBrokers } from '../../../hooks/useBrokers';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { riceLengthsAPI } from '../../../services/riceLengths.api';
import { vendorsAPI } from '../../../services/vendors.api';
import { brokersAPI } from '../../../services/brokers.api';
import { toRiceLengthLabelOptions } from '../../../utils/riceLengthModule';
import { paymentAdvicesAPI } from '../../../services/paymentAdvices.api';
import { inwardSlipPassesAPI } from '../../../services/inwardSlipPasses.api';
import { kaantasAPI } from '../../../services/kaantas.api';
import { getRiceTypeLabel, getRiceLengthLabel } from '../../../utils/riceType';
import { formatKgQuantity, formatSaudaPendingQuantity, isSaudaCompleted } from '../../../utils/saudaCompletion';
import { sortSaudasByDateAsc } from '../../../utils/saudaSerial';
import {
  buildFinancialYearFilterOptions,
  getCurrentFinancialYearKey,
  isIsoDateInFinancialYear,
} from '../../../utils/financialYear';
import { saudaToUpdatePayload } from '../../../utils/saudaPayload';
import { getSaudaBrokerName, getSaudaPurchaserName, getSaudaRiceCodeName, getSaudaRiceCategoryLabel, formatSaudaTypeLabel } from '../../../utils/saudaDisplay';
import { formatSaudaAvgGrainLengthDisplay, formatSaudaWhitenessDisplay } from '../../../utils/saudaParameters';
import { SaudaFormModal } from './SaudaFormModal';
import { SaudaCard } from './SaudaCard';
import { SaudaPreviewDialog } from './SaudaPreviewDialog';
import { SaudaEmailModal } from './SaudaEmailModal';
import { SaudaWhatsAppModal } from './SaudaWhatsAppModal';
import type {
  Sauda,
  RiceCode,
  RiceType,
  PaymentAdvice,
  InwardSlipPass,
  Kaanta,
  SaudaFilters,
} from '../../../types/entities';

interface SaudasTableProps {
  onRefreshRef?: React.MutableRefObject<(() => void) | null>;
}

type SaudaCompletionFilter = 'incomplete' | 'completed' | 'cancelled';

const SAUDA_COMPLETION_FILTER_OPTIONS: { label: string; value: SaudaCompletionFilter }[] = [
  { label: 'Incomplete sauda', value: 'incomplete' },
  { label: 'Complete sauda', value: 'completed' },
  { label: 'Cancelled sauda', value: 'cancelled' },
];

export function SaudasTable({ onRefreshRef }: SaudasTableProps = {}) {
  const [financialYearFilter, setFinancialYearFilter] = useState<string | undefined>(
    () => getCurrentFinancialYearKey(),
  );
  const [completionFilter, setCompletionFilter] = useState<SaudaCompletionFilter>('incomplete');
  /** Cancelled list uses API filter; incomplete/complete filter client-side on full list. */
  const listFilters = useMemo<SaudaFilters | undefined>(() => {
    if (completionFilter === 'cancelled') return { status: 'cancelled' };
    return undefined;
  }, [completionFilter]);

  const { saudas, loading, deleteSauda, refetch, updateSaudaStatus } = useSaudas(listFilters);
  const { vendors } = useVendors({ includeInactive: true });
  const { brokers } = useBrokers({ includeInactive: true });
  const [vendorNameById, setVendorNameById] = useState<Record<string, string>>({});
  const [brokerNameById, setBrokerNameById] = useState<Record<string, string>>({});
  const [riceCodeNameById, setRiceCodeNameById] = useState<Record<string, string>>({});
  const fetchedVendorIdsRef = useRef(new Set<string>());
  const fetchedBrokerIdsRef = useRef(new Set<string>());
  const fetchedRiceCodeIdsRef = useRef(new Set<string>());

  // Expose refetch function to parent via ref
  useEffect(() => {
    if (onRefreshRef) {
      onRefreshRef.current = refetch;
    }
  }, [refetch, onRefreshRef]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSauda, setSelectedSauda] = useState<Sauda | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [saudaToCancel, setSaudaToCancel] = useState<Sauda | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [saudaToComplete, setSaudaToComplete] = useState<Sauda | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSaudaId, setSelectedSaudaId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSauda, setPreviewSauda] = useState<Sauda | null>(null);
  const [previewSerial, setPreviewSerial] = useState<number | null>(null);
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [riceLengths, setRiceLengths] = useState<RiceType[]>([]);
  
  // Document viewer state
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [viewerDocuments, setViewerDocuments] = useState<DocumentInfo[]>([]);
  
  // Notification state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedSaudaForNotification, setSelectedSaudaForNotification] = useState<string | null>(null);
  
  // Usage tracking state
  const [paymentAdvices, setPaymentAdvices] = useState<PaymentAdvice[]>([]);
  const [inwardSlipPasses, setInwardSlipPasses] = useState<InwardSlipPass[]>([]);
  const [kaantas, setKaantas] = useState<Kaanta[]>([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('warning');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  /** Opens dialog with full kaanta / PA identifiers (ISP slip numbers only, no UUIDs). */
  const [usageDetailSaudaId, setUsageDetailSaudaId] = useState<string | null>(null);
  const [copiedUsageToken, setCopiedUsageToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadRiceMeta = async () => {
      try {
        const [codes, types, lengths] = await Promise.all([
          riceCodesAPI.getAllRiceCodes(),
          riceCodesAPI.getRiceTypes(),
          riceLengthsAPI.getAllRiceLengths(),
        ]);
        if (!cancelled) {
          setRiceCodes(codes);
          setRiceTypes(types);
          setRiceLengths(toRiceLengthLabelOptions(lengths));
        }
      } catch (error) {
        console.error('Failed to fetch rice codes / types / lengths:', error);
      }
    };
    void loadRiceMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch usage data to check sauda dependencies
  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        const [pas, isps, kaantasData] = await Promise.all([
          paymentAdvicesAPI.getAllPaymentAdvices(),
          inwardSlipPassesAPI.getAllInwardSlipPasses(),
          kaantasAPI.getAllKaantas()
        ]);
        setPaymentAdvices(pas);
        setInwardSlipPasses(isps);
        setKaantas(kaantasData);
      } catch (error) {
        console.error('Failed to fetch usage data:', error);
      }
    };
    fetchUsageData();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMissingPartyNames = async () => {
      const vendorIds = [
        ...new Set(
          saudas
            .map((sauda) => sauda.purchaser_id)
            .filter((id): id is string => !!id)
            .filter(
              (id) =>
                !vendors.some((vendor) => vendor.id === id) &&
                !fetchedVendorIdsRef.current.has(id),
            ),
        ),
      ];
      const brokerIds = [
        ...new Set(
          saudas
            .map((sauda) => sauda.broker_id)
            .filter((id): id is string => !!id)
            .filter(
              (id) =>
                !brokers.some((broker) => broker.id === id) &&
                !fetchedBrokerIdsRef.current.has(id),
            ),
        ),
      ];

      for (const id of vendorIds) fetchedVendorIdsRef.current.add(id);
      for (const id of brokerIds) fetchedBrokerIdsRef.current.add(id);

      const [vendorRows, brokerRows] = await Promise.all([
        Promise.all(
          vendorIds.map(async (id) => {
            try {
              const vendor = await vendorsAPI.getVendorById(id);
              return [id, vendor.business_name] as const;
            } catch {
              return [id, ''] as const;
            }
          }),
        ),
        Promise.all(
          brokerIds.map(async (id) => {
            try {
              const broker = await brokersAPI.getBrokerById(id);
              return [id, broker.business_name] as const;
            } catch {
              return [id, ''] as const;
            }
          }),
        ),
      ]);

      if (cancelled) return;

      setVendorNameById((prev) => {
        const next = { ...prev };
        for (const [id, name] of vendorRows) {
          if (name && !next[id]) next[id] = name;
        }
        return next;
      });
      setBrokerNameById((prev) => {
        const next = { ...prev };
        for (const [id, name] of brokerRows) {
          if (name && !next[id]) next[id] = name;
        }
        return next;
      });
    };

    void loadMissingPartyNames();
    return () => {
      cancelled = true;
    };
  }, [saudas, vendors, brokers]);

  useEffect(() => {
    let cancelled = false;

    const loadMissingRiceCodeNames = async () => {
      const riceCodeIds = [
        ...new Set(
          saudas
            .map((sauda) => sauda.rice_code_id)
            .filter((id): id is string => !!id)
            .filter(
              (id) =>
                !riceCodes.some((rc) => rc.rice_code_id === id) &&
                !fetchedRiceCodeIdsRef.current.has(id),
            ),
        ),
      ];

      for (const id of riceCodeIds) fetchedRiceCodeIdsRef.current.add(id);

      const rows = await Promise.all(
        riceCodeIds.map(async (id) => {
          try {
            const riceCode = await riceCodesAPI.getRiceCodeById(id);
            return [id, riceCode?.rice_code_name ?? ''] as const;
          } catch {
            return [id, ''] as const;
          }
        }),
      );

      if (cancelled) return;

      setRiceCodeNameById((prev) => {
        const next = { ...prev };
        for (const [id, name] of rows) {
          if (name && !next[id]) next[id] = name;
        }
        return next;
      });
    };

    void loadMissingRiceCodeNames();
    return () => {
      cancelled = true;
    };
  }, [saudas, riceCodes]);

  const getPurchaserName = (sauda: Sauda): string =>
    getSaudaPurchaserName(sauda, vendors, vendorNameById);

  const getBrokerName = (sauda: Sauda): string =>
    getSaudaBrokerName(sauda, brokers, brokerNameById);

  const getRiceCodeName = (sauda: Sauda): string =>
    getSaudaRiceCodeName(sauda, riceCodes, riceCodeNameById);

  const getSaudaRiceLengthLabel = (sauda: Sauda): string => {
    if (sauda.rice_length_name?.trim()) return sauda.rice_length_name.trim();
    if (sauda.rice_length_id) {
      const label = getRiceLengthLabel(sauda.rice_length_id, riceLengths);
      if (label) return label;
    }
    return getRiceLengthLabel(sauda.rice_length, riceLengths);
  };

  const formatSaudaDate = (sauda: Sauda): string => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    if (sauda.sauda_date) {
      return new Date(`${sauda.sauda_date}T00:00:00`).toLocaleDateString('en-IN', opts);
    }
    if (sauda.created_at) {
      return new Date(sauda.created_at).toLocaleDateString('en-IN', opts);
    }
    return '—';
  };

  const formatSaudaWeight = (sauda: Sauda): string => {
    if (sauda.quantity == null) return '—';
    return formatKgQuantity(sauda.quantity);
  };

  const getSaudaDisplayName = (sauda: Sauda): string => {
    const parts: string[] = [];
    
    const purchaserName = getPurchaserName(sauda);
    if (purchaserName) parts.push(purchaserName);
    
    const riceCodeName = getRiceCodeName(sauda);
    if (riceCodeName) parts.push(riceCodeName);
    
    const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, riceTypes);
    if (riceTypeLabel) parts.push(riceTypeLabel);
    const riceLengthLabel = getRiceLengthLabel(sauda.rice_length, riceLengths);
    if (riceLengthLabel) parts.push(riceLengthLabel);

    return parts.join(' - ') || 'Sauda';
  };

  // Check if sauda is used in any payment advice, ISP, or kaanta
  const isSaudaInUse = (saudaId: string): boolean => {
    const inPaymentAdvice = paymentAdvices.some(pa => pa.sauda_id === saudaId);
    const inISP = inwardSlipPasses.some(isp => isp.sauda_ids?.includes(saudaId));
    const inKaanta = kaantas.some(k => k.sauda_id === saudaId);
    return inPaymentAdvice || inISP || inKaanta;
  };

  // Get usage counts for a sauda
  const getSaudaUsageCounts = (saudaId: string): {
    paymentAdvices: number;
    isps: number;
    kaantas: number;
  } => {
    const paCount = paymentAdvices.filter(pa => pa.sauda_id === saudaId).length;
    const ispCount = inwardSlipPasses.filter(isp => isp.sauda_ids?.includes(saudaId)).length;
    const kaantaCount = kaantas.filter(k => k.sauda_id === saudaId).length;
    
    return {
      paymentAdvices: paCount,
      isps: ispCount,
      kaantas: kaantaCount
    };
  };

  /** ISP / kaanta / PA identifiers for Usage column (same sources as delete warning). */
  const getSaudaUsageDisplay = (saudaId: string) => {
    const counts = getSaudaUsageCounts(saudaId);
    const paymentAdviceLabels = paymentAdvices
      .filter((pa) => pa.sauda_id === saudaId)
      .map((pa) => pa.transaction_id || pa.id);
    const ispRows = inwardSlipPasses
      .filter((isp) => isp.sauda_ids?.includes(saudaId))
      .map((isp) => ({ id: isp.id, slipNumber: isp.slip_number || '—' }));
    const kaantaRows = kaantas
      .filter((k) => k.sauda_id === saudaId)
      .map((k) => ({ rowId: k.id, kaantaId: k.kaanta_id }));
    return { counts, paymentAdviceLabels, ispRows, kaantaRows };
  };

  const getLinkedUsageTotal = (saudaId: string) => {
    const { paymentAdvices, isps, kaantas } = getSaudaUsageCounts(saudaId);
    return paymentAdvices + isps + kaantas;
  };

  const openLinkedUsageDialog = (saudaId: string) => {
    setUsageDetailSaudaId(saudaId);
  };

  // Get usage details for a sauda (for delete warning)
  const getSaudaUsageDetails = async (saudaId: string): Promise<{
    paymentAdvices: string[];
    isps: string[];
    kaantas: string[];
  }> => {
    const paList = paymentAdvices
      .filter(pa => pa.sauda_id === saudaId)
      .map(pa => pa.transaction_id || pa.id);
    
    const ispList = inwardSlipPasses
      .filter(isp => isp.sauda_ids?.includes(saudaId))
      .map(isp => isp.slip_number || isp.id);
    
    const kaantaList = kaantas
      .filter(k => k.sauda_id === saudaId)
      .map(k => k.kaanta_id || k.id);
    
    return {
      paymentAdvices: paList,
      isps: ispList,
      kaantas: kaantaList
    };
  };

  const handleViewDocuments = (docs: DocumentInfo[]) => {
    setViewerDocuments(docs);
    setDocumentViewerOpen(true);
  };

  const copyUsageSnippet = async (token: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUsageToken(token);
      setTimeout(() => setCopiedUsageToken(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const financialYearOptions = useMemo(
    () => buildFinancialYearFilterOptions(saudas),
    [saudas],
  );

  const filtered = useMemo(() => {
    const rows = saudas.filter((s) => {
      if (completionFilter === 'cancelled') {
        if (s.status !== 'cancelled') return false;
      } else if (completionFilter === 'completed') {
        if (s.status === 'cancelled' || !isSaudaCompleted(s)) return false;
      } else {
        if (s.status === 'cancelled' || isSaudaCompleted(s)) return false;
      }
      if (financialYearFilter && !isIsoDateInFinancialYear(s.sauda_date, financialYearFilter)) {
        return false;
      }
      const q = searchQuery.toLowerCase();
      const displayName = getSaudaDisplayName(s).toLowerCase();
      const purchaserName = getPurchaserName(s).toLowerCase();
      const riceCodeName = getRiceCodeName(s).toLowerCase();
      const riceTypeLabel = getRiceTypeLabel(s.rice_type, riceTypes).toLowerCase();
      const riceLengthLabel = getSaudaRiceLengthLabel(s).toLowerCase();
      const brokerName = getBrokerName(s).toLowerCase();
      const matchesSearch =
        displayName.includes(q) ||
        purchaserName.includes(q) ||
        riceCodeName.includes(q) ||
        riceTypeLabel.includes(q) ||
        riceLengthLabel.includes(q) ||
        brokerName.includes(q) ||
        s.id.toLowerCase().includes(q);

      return matchesSearch;
    });
    return sortSaudasByDateAsc(rows);
  }, [saudas, completionFilter, financialYearFilter, searchQuery, riceCodes, riceTypes, riceLengths, vendors, brokers, vendorNameById, brokerNameById, riceCodeNameById]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search by purchaser, rice code, or type..." />
        </div>
        <div className="flex flex-wrap gap-2 items-end justify-end sm:justify-start">
          <FilterDropdown
            label="Financial year"
            options={financialYearOptions}
            value={financialYearFilter}
            onChange={setFinancialYearFilter}
          />
          <FilterDropdown
            label="Status"
            options={SAUDA_COMPLETION_FILTER_OPTIONS}
            value={completionFilter}
            onChange={(value) =>
              setCompletionFilter((value as SaudaCompletionFilter | undefined) ?? 'incomplete')
            }
            hideAllOption
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No saudas found"
          description={
            completionFilter === 'cancelled'
              ? 'No cancelled saudas match your search or filters.'
              : completionFilter === 'completed'
                ? 'No completed saudas match your search or filters.'
                : financialYearFilter
                ? `No saudas found for ${financialYearOptions.find((o) => o.value === financialYearFilter)?.label ?? financialYearFilter}. Try another financial year or adjust filters.`
                : 'Create your first sauda or adjust filters.'
          }
        />
      ) : (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s, rowIndex) => {
            const serial = rowIndex + 1;
            const riceLengthLabel = getSaudaRiceLengthLabel(s);
            const whitenessLabel = formatSaudaWhitenessDisplay(s.parameters?.whiteness);
            const avgGrainLengthLabel = formatSaudaAvgGrainLengthDisplay(
              s.parameters?.average_grain_length,
            );
            const linkedCount = getLinkedUsageTotal(s.id);
            return (
              <SaudaCard
                key={s.id}
                partyName={getPurchaserName(s)}
                saudaDate={formatSaudaDate(s)}
                riceCategoryLabel={getSaudaRiceCategoryLabel(s, riceCodes)}
                riceTypeLabel={getRiceTypeLabel(s.rice_type, riceTypes)}
                riceCodeName={getRiceCodeName(s)}
                riceLengthLabel={riceLengthLabel || null}
                whitenessLabel={whitenessLabel !== '—' ? whitenessLabel : null}
                avgGrainLengthLabel={avgGrainLengthLabel !== '—' ? avgGrainLengthLabel : null}
                weightLabel={formatSaudaWeight(s)}
                noOfBags={s.no_of_bags ?? null}
                bagWeightLabel={s.bag_weight != null ? formatKgQuantity(s.bag_weight) : null}
                rateLabel={`₹${(s.rate ?? 0).toFixed(2)}`}
                saudaTypeLabel={formatSaudaTypeLabel(s.sauda_type)}
                brokerName={getBrokerName(s)}
                receivedLabel={formatKgQuantity(s.received_until_now)}
                pendingLabel={formatSaudaPendingQuantity(s.quantity, s.received_until_now)}
                actions={
                  <>
                    <button
                      onClick={() => {
                        setPreviewSauda(s);
                        setPreviewSerial(serial);
                        setPreviewOpen(true);
                      }}
                      className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/15"
                      title="View Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSaudaForNotification(s.id);
                        setEmailModalOpen(true);
                      }}
                      className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-500/10"
                      title="Send Email"
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSaudaForNotification(s.id);
                        setWhatsappModalOpen(true);
                      }}
                      className="rounded-lg p-2 text-emerald-500 transition-colors hover:bg-emerald-500/10"
                      title="Send WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openLinkedUsageDialog(s.id)}
                      className={`relative rounded-lg p-2 transition-colors ${
                        linkedCount > 0
                          ? 'text-sky-600 hover:bg-sky-500/10'
                          : 'text-muted-foreground hover:bg-muted/80'
                      }`}
                      title={
                        linkedCount > 0
                          ? `View ${linkedCount} linked record${linkedCount === 1 ? '' : 's'} (ISP, payment advice, kaanta)`
                          : 'View linked records (ISP, payment advice, kaanta)'
                      }
                    >
                      <Link2 className="h-4 w-4" />
                      {linkedCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-bold text-white">
                          {linkedCount > 9 ? '9+' : linkedCount}
                        </span>
                      )}
                    </button>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button className="rounded-lg p-2 transition-colors hover:bg-muted/80">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className="glass min-w-[10rem] rounded-xl p-1 shadow-lg z-50"
                          sideOffset={8}
                          align="end"
                        >
                          <DropdownMenu.Label className="px-3 py-1.5 text-xs text-muted-foreground font-medium">
                            View Images
                          </DropdownMenu.Label>
                          <DropdownMenu.Item
                            className={`flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                              s.cooked_rice_image_url
                                ? 'hover:bg-accent hover:text-accent-foreground text-amber-600'
                                : 'text-muted-foreground/50 cursor-not-allowed'
                            }`}
                            disabled={!s.cooked_rice_image_url}
                            onSelect={() => s.cooked_rice_image_url && handleViewDocuments([{ url: s.cooked_rice_image_url, label: 'Cooked Rice Sample', type: 'image' }])}
                          >
                            <UtensilsCrossed className="h-4 w-4" /> Cooked Rice
                            {!s.cooked_rice_image_url && <span className="ml-auto text-[10px]">N/A</span>}
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            className={`flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                              s.uncooked_rice_image_url
                                ? 'hover:bg-accent hover:text-accent-foreground text-amber-600'
                                : 'text-muted-foreground/50 cursor-not-allowed'
                            }`}
                            disabled={!s.uncooked_rice_image_url}
                            onSelect={() => s.uncooked_rice_image_url && handleViewDocuments([{ url: s.uncooked_rice_image_url, label: 'Uncooked Rice Sample', type: 'image' }])}
                          >
                            <Wheat className="h-4 w-4" /> Uncooked Rice
                            {!s.uncooked_rice_image_url && <span className="ml-auto text-[10px]">N/A</span>}
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="my-1 h-px bg-border" />
                          <DropdownMenu.Separator className="my-1 h-px bg-border" />
                          <DropdownMenu.Item
                            className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            onSelect={() => openLinkedUsageDialog(s.id)}
                          >
                            <Link2 className="h-4 w-4" />
                            Linked records
                            {linkedCount > 0 && (
                              <span className="ml-auto rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                                {linkedCount}
                              </span>
                            )}
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            onSelect={() => {
                              setSelectedSaudaId(s.id);
                              setEditModalOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" /> Edit
                          </DropdownMenu.Item>
                          {s.status !== 'cancelled' &&
                            s.status !== 'completed' &&
                            (s.completion_percentage === null || s.completion_percentage < 100) && (
                              <DropdownMenu.Item
                                className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                                onSelect={() => {
                                  setSaudaToComplete(s);
                                  setCompleteDialogOpen(true);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4" /> Complete Sauda
                              </DropdownMenu.Item>
                            )}
                          {s.status !== 'cancelled' && (
                            <DropdownMenu.Item
                              className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                              onSelect={() => {
                                setSaudaToCancel(s);
                                setCancelDialogOpen(true);
                              }}
                            >
                              <Ban className="h-4 w-4" /> Cancel Sauda
                            </DropdownMenu.Item>
                          )}
                          <DropdownMenu.Item
                            className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onSelect={async () => {
                              if (isSaudaInUse(s.id)) {
                                const usage = await getSaudaUsageDetails(s.id);
                                const parts: string[] = [];
                                if (usage.paymentAdvices.length > 0) {
                                  parts.push(`Payment Advices (${usage.paymentAdvices.length}):\n${usage.paymentAdvices.map((pa, i) => `${i + 1}. ${pa}`).join('\n')}`);
                                }
                                if (usage.isps.length > 0) {
                                  parts.push(`Inward Slip Passes (${usage.isps.length}):\n${usage.isps.map((isp, i) => `${i + 1}. ${isp}`).join('\n')}`);
                                }
                                if (usage.kaantas.length > 0) {
                                  parts.push(`Kaantas (${usage.kaantas.length}):\n${usage.kaantas.map((k, i) => `${i + 1}. ${k}`).join('\n')}`);
                                }
                                setAlertType('warning');
                                setAlertTitle('Cannot Delete Sauda');
                                setAlertMessage(`This sauda is currently used in:\n\n${parts.join('\n\n')}\n\nPlease remove it from all related records before deleting.`);
                                setAlertOpen(true);
                                return;
                              }
                              setSelectedSauda(s);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </>
                }
              />
            );
          })}
        </div>
      )}

      <Dialog.Root
        open={usageDetailSaudaId != null}
        onOpenChange={(open) => {
          if (!open) setUsageDetailSaudaId(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[70] flex max-h-[min(85vh,40rem)] w-[min(92vw,28rem)] flex-col -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
              <div className="min-w-0 pr-2">
                <Dialog.Title className="text-base font-semibold">Linked records</Dialog.Title>
                <Dialog.Description className="mt-1 text-xs text-muted-foreground">
                  Inward slip passes, payment advices, and kaantas linked to this sauda.
                </Dialog.Description>
                {usageDetailSaudaId && (() => {
                  const sd = saudas.find((x) => x.id === usageDetailSaudaId);
                  const label = sd ? getSaudaDisplayName(sd) : usageDetailSaudaId;
                  return (
                    <p className="mt-2 truncate text-sm font-medium" title={label}>
                      {label}
                    </p>
                  );
                })()}
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-4">
              {usageDetailSaudaId &&
                (() => {
                  const u = getSaudaUsageDisplay(usageDetailSaudaId);
                  const sid = usageDetailSaudaId;
                  const hasAny =
                    u.paymentAdviceLabels.length > 0 ||
                    u.ispRows.length > 0 ||
                    u.kaantaRows.length > 0;
                  return (
                    <div className="space-y-6 text-sm">
                      {!hasAny && (
                        <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                          This sauda is not linked to any inward slip pass, payment advice, or kaanta yet.
                        </p>
                      )}
                      {u.paymentAdviceLabels.length > 0 && (
                        <section>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Payment advices
                          </h3>
                          <ul className="space-y-2">
                            {u.paymentAdviceLabels.map((label, i) => (
                              <li
                                key={`d-pa-${sid}-${i}-${label}`}
                                className="flex items-start justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 font-mono text-xs break-all"
                              >
                                <span>{label}</span>
                                <button
                                  type="button"
                                  className="shrink-0 rounded p-1 text-primary hover:bg-primary/10"
                                  aria-label="Copy"
                                  onClick={() => void copyUsageSnippet(`${sid}-pa-${i}`, label)}
                                >
                                  {copiedUsageToken === `${sid}-pa-${i}` ? (
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                      {u.ispRows.length > 0 && (
                        <section>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Inward slip passes
                          </h3>
                          <ul className="space-y-1.5">
                            {u.ispRows.map((isp) => (
                              <li
                                key={isp.id}
                                className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 text-sm"
                              >
                                {isp.slipNumber}
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                      {u.kaantaRows.length > 0 && (
                        <section>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Kaantas
                          </h3>
                          <ul className="space-y-3">
                            {u.kaantaRows.map((k, idx) => (
                              <li
                                key={k.rowId}
                                className="rounded-md border border-border/60 bg-muted/20 p-2.5"
                              >
                                <div className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                                  {u.kaantaRows.length > 1 ? `Kaanta ${idx + 1}` : 'Kaanta'}
                                </div>
                                <div className="flex items-start justify-between gap-2 font-mono text-[11px] leading-relaxed break-all">
                                  <span>
                                    <span className="text-muted-foreground">Kaanta ID: </span>
                                    {k.kaantaId}
                                  </span>
                                  <button
                                    type="button"
                                    className="shrink-0 rounded p-1 text-primary hover:bg-primary/10"
                                    aria-label="Copy kaanta ID"
                                    onClick={() => void copyUsageSnippet(`${sid}-kid-${k.rowId}`, k.kaantaId)}
                                  >
                                    {copiedUsageToken === `${sid}-kid-${k.rowId}` ? (
                                      <Check className="h-3.5 w-3.5 text-green-600" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </div>
                  );
                })()}
            </div>
            <div className="border-t border-border pt-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="w-full rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted"
                >
                  Close
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          setCancelDialogOpen(open);
          if (!open) setSaudaToCancel(null);
        }}
        onConfirm={async () => {
          if (!saudaToCancel) return;
          try {
            await updateSaudaStatus(
              saudaToCancel.id,
              saudaToUpdatePayload(saudaToCancel, { status: 'cancelled' })
            );
          } catch (err: any) {
            setAlertType('error');
            setAlertTitle('Could not cancel sauda');
            setAlertMessage(err?.message || 'Please try again.');
            setAlertOpen(true);
          }
        }}
        title="Cancel Sauda"
        description={
          saudaToCancel
            ? `Mark “${getSaudaDisplayName(saudaToCancel)}” as cancelled? You can still view it in the list.`
            : ''
        }
        confirmText="Yes, cancel sauda"
        variant="warning"
      />

      <ConfirmDialog
        open={completeDialogOpen}
        onOpenChange={(open) => {
          setCompleteDialogOpen(open);
          if (!open) setSaudaToComplete(null);
        }}
        onConfirm={async () => {
          if (!saudaToComplete) return;
          try {
            await updateSaudaStatus(
              saudaToComplete.id,
              saudaToUpdatePayload(saudaToComplete, { status: 'completed' })
            );
          } catch (err: any) {
            setAlertType('error');
            setAlertTitle('Could not complete sauda');
            setAlertMessage(err?.message || 'Please try again.');
            setAlertOpen(true);
          }
        }}
        title="Complete Sauda"
        description={
          saudaToComplete
            ? `Mark “${getSaudaDisplayName(saudaToComplete)}” as completed in workflow? Delivery progress (e.g. ${saudaToComplete.completion_percentage != null ? `${saudaToComplete.completion_percentage.toFixed(2)}%` : 'N/A'} received) will stay as calculated.`
            : ''
        }
        confirmText="Yes, mark completed"
        variant="warning"
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => {
          if (selectedSauda) {
            await deleteSauda(selectedSauda.id);
            setDeleteDialogOpen(false);
            setSelectedSauda(null);
            // Refresh usage data after deletion
            const [pas, isps, kaantasData] = await Promise.all([
              paymentAdvicesAPI.getAllPaymentAdvices(),
              inwardSlipPassesAPI.getAllInwardSlipPasses(),
              kaantasAPI.getAllKaantas()
            ]);
            setPaymentAdvices(pas);
            setInwardSlipPasses(isps);
            setKaantas(kaantasData);
          }
        }}
        title="Delete Sauda"
        description={`Are you sure you want to delete ${selectedSauda ? getSaudaDisplayName(selectedSauda) : 'this sauda'}? This action cannot be undone.`}
        confirmText="Delete"
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />

      {editModalOpen && selectedSaudaId ? (
        <SaudaFormModal
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) {
              setSelectedSaudaId(null);
              refetch();
            }
          }}
          saudaId={selectedSaudaId}
          onSuccess={refetch}
        />
      ) : null}

      {previewOpen && previewSauda ? (
        <SaudaPreviewDialog
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open);
            if (!open) {
              setPreviewSerial(null);
            }
          }}
          sauda={previewSauda}
          serialNumber={previewSerial ?? undefined}
        />
      ) : null}

      <DocumentViewerModal
        open={documentViewerOpen}
        onOpenChange={setDocumentViewerOpen}
        document={viewerDocuments[0] || null}
        documents={viewerDocuments}
      />

      {selectedSaudaForNotification && (
        <>
          <SaudaEmailModal
            open={emailModalOpen}
            onOpenChange={(open) => {
              setEmailModalOpen(open);
              if (!open) {
                setSelectedSaudaForNotification(null);
              }
            }}
            saudaId={selectedSaudaForNotification}
            onSuccess={() => {
              refetch();
            }}
          />

          <SaudaWhatsAppModal
            open={whatsappModalOpen}
            onOpenChange={(open) => {
              setWhatsappModalOpen(open);
              if (!open) {
                setSelectedSaudaForNotification(null);
              }
            }}
            saudaId={selectedSaudaForNotification}
            onSuccess={() => {
              refetch();
            }}
          />
        </>
      )}
    </div>
  );
}

