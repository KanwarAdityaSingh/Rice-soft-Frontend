import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Scale, Package, Check, Circle, Trash2, Pencil, Image as ImageIcon, Upload } from 'lucide-react';
import { kaantasAPI } from '../../../services/kaantas.api';
import { saudasAPI } from '../../../services/saudas.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { DocumentViewerModal, type DocumentInfo } from '../../shared/DocumentViewerModal';
import { CustomSelect } from '../../shared/CustomSelect';
import { getRiceTypeLabel } from '../../../utils/riceType';
import { getCompletionStatus, formatCompletionPercentage, formatWeightDisplay, calculateRemainingWeight } from '../../../utils/saudaCompletion';
import type {
  InwardSlipPass,
  Sauda,
  RiceCode,
  RiceType,
  BagType,
  CreateKaantaRequest,
  Kaanta,
  UpdateKaantaRequest,
} from '../../../types/entities';
import { KAANTA_BAG_TYPE_OPTIONS, formatKaantaBagTypeLabel } from '../../../constants/bagAndPacketTypes';

interface KaantaWeightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isp: InwardSlipPass | null;
  onSuccess?: () => void;
}

interface KaantaEntry {
  sauda_id: string;
  full_truck_weight: string;
  empty_truck_weight: string;
  said_sent_weight: string;
  bag_weight: string;
  no_of_bags: string;
  bag_type: BagType;
  isEnabled: boolean;
}

const KAANTA_OVERWEIGHT_TOLERANCE_KG = 1000;

/** Auto bag weight = smallest whole kg ≥ (net ÷ bags), i.e. Math.ceil(raw kg/bag). */
function ceilToNearestGreaterWholeKg(rawKgPerBag: number): number | null {
  if (!Number.isFinite(rawKgPerBag) || rawKgPerBag <= 0) return null;
  return Math.ceil(rawKgPerBag);
}

function kaantaToEditDraft(kaanta: Kaanta): KaantaEntry {
  return {
    sauda_id: kaanta.sauda_id,
    full_truck_weight: String(kaanta.full_truck_weight),
    empty_truck_weight: String(kaanta.empty_truck_weight),
    said_sent_weight:
      kaanta.said_sent_weight != null && kaanta.said_sent_weight !== undefined
        ? String(kaanta.said_sent_weight)
        : '',
    bag_weight: String(kaanta.bag_weight),
    no_of_bags: String(kaanta.no_of_bags),
    bag_type: kaanta.bag_type,
    isEnabled: true,
  };
}

export function KaantaWeightDialog({ open, onOpenChange, isp, onSuccess }: KaantaWeightDialogProps) {
  // Data loading
  const [saudas, setSaudas] = useState<Sauda[]>([]);
  const [existingKaantas, setExistingKaantas] = useState<Kaanta[]>([]);
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Multi-entry form
  const [kaantaEntries, setKaantaEntries] = useState<KaantaEntry[]>([]);
  
  // UI state
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [deletingKaantaId, setDeletingKaantaId] = useState<string | null>(null);
  const [editingKaantaId, setEditingKaantaId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<KaantaEntry | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [updatingKaantaId, setUpdatingKaantaId] = useState<string | null>(null);

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState<Record<string, boolean>>({});
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [viewerDocuments, setViewerDocuments] = useState<DocumentInfo[]>([]);

  // Load data when dialog opens
  useEffect(() => {
    if (open && isp) {
      fetchData();
    }
  }, [open, isp]);

  useEffect(() => {
    if (!open) {
      setEditingKaantaId(null);
      setEditDraft(null);
      setEditErrors({});
      setUpdatingKaantaId(null);
    }
  }, [open]);

  const fetchData = async () => {
    if (!isp?.sauda_ids?.length) return;
    setLoadingData(true);
    try {
      const [allSaudas, codes, types, kaantas] = await Promise.all([
        saudasAPI.getAllSaudas(),
        riceCodesAPI.getAllRiceCodes(),
        riceCodesAPI.getRiceTypes(),
        kaantasAPI.getAllKaantas(undefined, isp.id)
      ]);
      
      const filteredSaudas = allSaudas.filter(s => isp.sauda_ids.includes(s.id));
      setSaudas(filteredSaudas);
      setRiceCodes(codes);
      setRiceTypes(types);
      setExistingKaantas(kaantas);
      
      // Initialize entries for saudas that don't have kaantas yet
      const saudasWithKaanta = new Set(kaantas.map(k => k.sauda_id));
      const saudasWithoutKaanta = filteredSaudas.filter(s => !saudasWithKaanta.has(s.id));
      
      if (saudasWithoutKaanta.length > 0) {
        setKaantaEntries(saudasWithoutKaanta.map(s => ({
          sauda_id: s.id,
          full_truck_weight: '',
          empty_truck_weight: '',
          said_sent_weight: '',
          bag_weight: '',
          no_of_bags: '',
          bag_type: 'pp' as BagType,
          isEnabled: true,
        })));
      } else {
        setKaantaEntries([]);
      }
      setErrors({});
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const getRiceCodeName = (riceCodeId: string | null | undefined): string => {
    if (!riceCodeId) return '';
    const riceCode = riceCodes.find(rc => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : '';
  };

  const getSaudaDisplayName = (sauda: Sauda): string => {
    const parts: string[] = [];
    const riceCodeName = getRiceCodeName(sauda.rice_code_id);
    if (riceCodeName) parts.push(riceCodeName);
    const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, riceTypes);
    if (riceTypeLabel) parts.push(riceTypeLabel);
    return parts.join(' - ');
  };

  const getSaudaById = (saudaId: string): Sauda | undefined => {
    return saudas.find(s => s.id === saudaId);
  };

  const calculateKaantaWeight = (entry: KaantaEntry): number => {
    const full = parseFloat(entry.full_truck_weight) || 0;
    const empty = parseFloat(entry.empty_truck_weight) || 0;
    return Math.max(0, full - empty);
  };

  const isEntryFilled = (entry: KaantaEntry): boolean => {
    return !!(
      entry.full_truck_weight &&
      entry.empty_truck_weight &&
      entry.said_sent_weight &&
      entry.no_of_bags &&
      entry.bag_weight
    );
  };

  const getFilledEntries = (): KaantaEntry[] => {
    return kaantaEntries.filter(entry => entry.isEnabled && isEntryFilled(entry));
  };

  // Calculate completion percentage
  const totalSaudas = saudas.length;
  const completedSaudas = existingKaantas.length;
  const completionPercentage = totalSaudas > 0 ? Math.round((completedSaudas / totalSaudas) * 100) : 0;

  const updateEntry = (index: number, field: keyof KaantaEntry, value: string | boolean) => {
    const newEntries = [...kaantaEntries];
    newEntries[index] = { ...newEntries[index], [field]: value };

    // Auto bag weight from net ÷ manual bag count: ceil to nearest greater whole kg.
    if (
      typeof value === 'string' &&
      (field === 'no_of_bags' || field === 'full_truck_weight' || field === 'empty_truck_weight')
    ) {
      const updatedEntry = newEntries[index];
      const fullWeight = parseFloat(updatedEntry.full_truck_weight) || 0;
      const emptyWeight = parseFloat(updatedEntry.empty_truck_weight) || 0;
      const kaantaWeight = Math.max(0, fullWeight - emptyWeight);
      const bags = parseInt(updatedEntry.no_of_bags, 10);

      if (kaantaWeight > 0 && !Number.isNaN(bags) && bags > 0) {
        const rawKgPerBag = kaantaWeight / bags;
        const ceiled = ceilToNearestGreaterWholeKg(rawKgPerBag);
        newEntries[index] = {
          ...newEntries[index],
          bag_weight: ceiled !== null ? String(ceiled) : '',
        };
      } else {
        newEntries[index] = { ...newEntries[index], bag_weight: '' };
      }
    }

    setKaantaEntries(newEntries);
  };

  const toggleEntry = (index: number) => {
    const newEntries = [...kaantaEntries];
    newEntries[index] = { ...newEntries[index], isEnabled: !newEntries[index].isEnabled };
    setKaantaEntries(newEntries);
  };

  const validateFilledEntries = (): boolean => {
    const newErrors: Record<string, Record<string, string>> = {};
    let isValid = true;
    const filledEntries = getFilledEntries();

    if (filledEntries.length === 0) {
      setAlertType('warning');
      setAlertTitle('No Data');
      setAlertMessage('Please fill in at least one kaanta entry');
      setAlertOpen(true);
      return false;
    }

    kaantaEntries.forEach((entry, index) => {
      if (!entry.isEnabled || !isEntryFilled(entry)) {
        return;
      }

      const entryErrors: Record<string, string> = {};
      
      const full = parseFloat(entry.full_truck_weight);
      const empty = parseFloat(entry.empty_truck_weight);
      const saidSent = parseFloat(entry.said_sent_weight);
      const bagWt = parseFloat(entry.bag_weight);
      const bags = parseInt(entry.no_of_bags);

      if (!entry.full_truck_weight || isNaN(full) || full <= 0) {
        entryErrors.fullTruckWeight = 'Required and must be > 0';
        isValid = false;
      }

      if (!entry.empty_truck_weight || isNaN(empty) || empty <= 0) {
        entryErrors.emptyTruckWeight = 'Required and must be > 0';
        isValid = false;
      }

      if (full > 0 && empty > 0 && empty >= full) {
        entryErrors.emptyTruckWeight = 'Must be less than full weight';
        isValid = false;
      }

      if (!entry.said_sent_weight || isNaN(saidSent) || saidSent <= 0) {
        entryErrors.saidSentWeight = 'Required and must be > 0';
        isValid = false;
      }

      if (!entry.bag_weight || isNaN(bagWt) || bagWt <= 0) {
        entryErrors.bagWeight = 'Required and must be > 0';
        isValid = false;
      }

      if (!entry.no_of_bags || isNaN(bags) || bags <= 0) {
        entryErrors.noOfBags = 'Required and must be > 0';
        isValid = false;
      }

      // Validate against remaining weight
      const sauda = getSaudaById(entry.sauda_id);
      if (sauda) {
        const kaantaWeight = calculateKaantaWeight(entry);
        if (kaantaWeight > 0) {
          const remaining = calculateRemainingWeight(sauda.quantity, sauda.received_until_now);
          if (remaining !== null && kaantaWeight > remaining + KAANTA_OVERWEIGHT_TOLERANCE_KG) {
            const maxAllowed = remaining + KAANTA_OVERWEIGHT_TOLERANCE_KG;
            entryErrors.fullTruckWeight = `Cannot exceed ${maxAllowed.toFixed(2)} kg (remaining ${remaining.toFixed(2)} + ${KAANTA_OVERWEIGHT_TOLERANCE_KG} kg tolerance)`;
            isValid = false;
          }
        }
      }

      if (Object.keys(entryErrors).length > 0) {
        newErrors[index] = entryErrors;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFilledEntries() || !isp) return;

    const filledEntries = getFilledEntries();
    if (filledEntries.length === 0) return;

    setLoading(true);
    try {
      const promises = filledEntries.map(entry => {
        const kaantaData: CreateKaantaRequest = {
          sauda_id: entry.sauda_id,
          inward_slip_pass_id: isp.id,
          full_truck_weight: parseFloat(entry.full_truck_weight),
          empty_truck_weight: parseFloat(entry.empty_truck_weight),
          said_sent_weight: parseFloat(entry.said_sent_weight),
          bag_weight: parseFloat(entry.bag_weight),
          no_of_bags: parseInt(entry.no_of_bags),
          bag_type: entry.bag_type,
        };
        return kaantasAPI.createKaanta(kaantaData);
      });

      await Promise.all(promises);
      
      setAlertType('success');
      setAlertTitle('Success');
      setAlertMessage(`${filledEntries.length} Kaanta(s) created successfully! Lots have been auto-created.`);
      setAlertOpen(true);
      
      // Refresh data to show newly created kaantas and updated sauda completion status
      await fetchData();
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to create kaantas');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const beginEditKaanta = (kaanta: Kaanta) => {
    setEditingKaantaId(kaanta.id);
    setEditDraft(kaantaToEditDraft(kaanta));
    setEditErrors({});
  };

  const cancelEditKaanta = () => {
    setEditingKaantaId(null);
    setEditDraft(null);
    setEditErrors({});
  };

  const updateEditDraftField = (field: keyof KaantaEntry, value: string | boolean) => {
    if (!editDraft) return;
    let next: KaantaEntry = { ...editDraft, [field]: value } as KaantaEntry;

    if (
      typeof value === 'string' &&
      (field === 'no_of_bags' || field === 'full_truck_weight' || field === 'empty_truck_weight')
    ) {
      const fullWeight = parseFloat(next.full_truck_weight) || 0;
      const emptyWeight = parseFloat(next.empty_truck_weight) || 0;
      const kaantaWeight = Math.max(0, fullWeight - emptyWeight);
      const bags = parseInt(next.no_of_bags, 10);

      if (kaantaWeight > 0 && !Number.isNaN(bags) && bags > 0) {
        const rawKgPerBag = kaantaWeight / bags;
        const ceiled = ceilToNearestGreaterWholeKg(rawKgPerBag);
        next = {
          ...next,
          bag_weight: ceiled !== null ? String(ceiled) : '',
        };
      } else {
        next = { ...next, bag_weight: '' };
      }
    }

    setEditDraft(next);
    setEditErrors({});
  };

  const validateEditDraft = (original: Kaanta): boolean => {
    if (!editDraft) return false;
    const entryErrors: Record<string, string> = {};
    let isValid = true;

    const full = parseFloat(editDraft.full_truck_weight);
    const empty = parseFloat(editDraft.empty_truck_weight);
    const saidSent = parseFloat(editDraft.said_sent_weight);
    const bagWt = parseFloat(editDraft.bag_weight);
    const bags = parseInt(editDraft.no_of_bags, 10);

    if (!editDraft.full_truck_weight || isNaN(full) || full <= 0) {
      entryErrors.fullTruckWeight = 'Required and must be > 0';
      isValid = false;
    }

    if (!editDraft.empty_truck_weight || isNaN(empty) || empty <= 0) {
      entryErrors.emptyTruckWeight = 'Required and must be > 0';
      isValid = false;
    }

    if (full > 0 && empty > 0 && empty >= full) {
      entryErrors.emptyTruckWeight = 'Must be less than full weight';
      isValid = false;
    }

    if (!editDraft.said_sent_weight || isNaN(saidSent) || saidSent <= 0) {
      entryErrors.saidSentWeight = 'Required and must be > 0';
      isValid = false;
    }

    if (!editDraft.bag_weight || isNaN(bagWt) || bagWt <= 0) {
      entryErrors.bagWeight = 'Required and must be > 0';
      isValid = false;
    }

    if (!editDraft.no_of_bags || isNaN(bags) || bags <= 0) {
      entryErrors.noOfBags = 'Required and must be > 0';
      isValid = false;
    }

    const sauda = getSaudaById(editDraft.sauda_id);
    if (sauda) {
      const kaantaWeight = calculateKaantaWeight(editDraft);
      if (kaantaWeight > 0) {
        const remaining = calculateRemainingWeight(sauda.quantity, sauda.received_until_now);
        if (remaining !== null) {
          const maxAllowed = remaining + original.kaanta_weight + KAANTA_OVERWEIGHT_TOLERANCE_KG;
          if (kaantaWeight > maxAllowed) {
            entryErrors.fullTruckWeight = `Net cannot exceed ${maxAllowed.toFixed(2)} kg for this sauda (includes this kaanta's current ${original.kaanta_weight.toFixed(2)} kg + ${KAANTA_OVERWEIGHT_TOLERANCE_KG} kg tolerance)`;
            isValid = false;
          }
        }
      }
    }

    setEditErrors(entryErrors);
    return isValid;
  };

  const handleSaveKaantaEdit = async (original: Kaanta) => {
    if (!editDraft || editingKaantaId !== original.id) return;
    if (!validateEditDraft(original)) {
      setAlertType('warning');
      setAlertTitle('Check fields');
      setAlertMessage('Fix the highlighted errors before saving.');
      setAlertOpen(true);
      return;
    }

    setUpdatingKaantaId(original.id);
    try {
      const payload: UpdateKaantaRequest = {
        full_truck_weight: parseFloat(editDraft.full_truck_weight),
        empty_truck_weight: parseFloat(editDraft.empty_truck_weight),
        said_sent_weight: parseFloat(editDraft.said_sent_weight),
        bag_weight: parseFloat(editDraft.bag_weight),
        no_of_bags: parseInt(editDraft.no_of_bags, 10),
        bag_type: editDraft.bag_type,
      };
      await kaantasAPI.updateKaanta(original.id, payload);
      setAlertType('success');
      setAlertTitle('Updated');
      setAlertMessage('Kaanta saved. Linked lot and inventory were updated on the server.');
      setAlertOpen(true);
      cancelEditKaanta();
      await fetchData();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to update kaanta');
      setAlertOpen(true);
    } finally {
      setUpdatingKaantaId(null);
    }
  };

  const handleDeleteKaanta = async (kaantaId: string) => {
    setDeletingKaantaId(kaantaId);
    try {
      await kaantasAPI.deleteKaanta(kaantaId);
      setAlertType('success');
      setAlertTitle('Deleted');
      setAlertMessage('Kaanta and associated lot deleted successfully');
      setAlertOpen(true);
      
      // Refresh data to show updated sauda completion status
      await fetchData();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to delete kaanta');
      setAlertOpen(true);
    } finally {
      setDeletingKaantaId(null);
    }
  };

  const handleImageUpload = async (kaantaId: string, imageType: 'khaali' | 'bhara', file: File) => {
    const uploadKey = `${kaantaId}-${imageType}`;
    setUploadingImage(prev => ({ ...prev, [uploadKey]: true }));
    try {
      if (imageType === 'khaali') {
        await kaantasAPI.uploadKhaaliKaantaParchi(kaantaId, file);
      } else {
        await kaantasAPI.uploadBharaKaantaParchi(kaantaId, file);
      }
      setAlertType('success');
      setAlertTitle('Success');
      setAlertMessage('Image uploaded successfully');
      setAlertOpen(true);
      
      // Refresh data to show updated image URLs
      await fetchData();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to upload image');
      setAlertOpen(true);
    } finally {
      setUploadingImage(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handleViewImage = (kaanta: Kaanta, imageType: 'khaali' | 'bhara') => {
    const imageUrl = imageType === 'khaali' 
      ? kaanta.khaali_kaanta_parchi_url 
      : kaanta.bhara_kaanta_parchi_url;
    
    if (imageUrl) {
      const label = imageType === 'khaali' 
        ? 'Khaali Kaanta Parchi (Empty)' 
        : 'Bhara Kaanta Parchi (Filled)';
      setViewerDocuments([{ url: imageUrl, label, type: 'image' }]);
      setDocumentViewerOpen(true);
    }
  };

  const filledCount = getFilledEntries().length;

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 bg-primary/15 rounded-lg shrink-0">
                    <Scale className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <Dialog.Title className="text-lg font-semibold tracking-tight">
                      Kaanta (weighbridge)
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-muted-foreground mt-0.5 truncate" title={`${isp?.slip_number} · ${isp?.party_name}`}>
                      {isp?.slip_number} · {isp?.party_name}
                    </Dialog.Description>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Completion — single compact row */}
              <div className="mb-5 rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 gap-y-1.5 mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sauda progress
                  </span>
                  <span className="text-xs tabular-nums text-foreground">
                    <span className="font-semibold text-foreground">{completedSaudas}</span>
                    <span className="text-muted-foreground"> / {totalSaudas}</span>
                    <span className="text-muted-foreground ml-1">({completionPercentage}%)</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      completionPercentage === 100 ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
                  {saudas.map((sauda) => {
                    const hasKaanta = existingKaantas.some(k => k.sauda_id === sauda.id);
                    return (
                      <span
                        key={sauda.id}
                        className={`inline-flex max-w-[140px] items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] ${
                          hasKaanta
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-800 dark:text-amber-400'
                        }`}
                        title={getSaudaDisplayName(sauda)}
                      >
                        {hasKaanta ? <Check className="h-3 w-3 shrink-0" /> : <Circle className="h-3 w-3 shrink-0" />}
                        <span className="truncate">{getSaudaDisplayName(sauda).split(' - ')[0]}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {loadingData ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  {/* Already Created Kaantas */}
                  {existingKaantas.length > 0 && (
                    <div className="mb-5">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                        Recorded ({existingKaantas.length})
                      </h3>
                      <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
                        Use Edit to correct weights or bags; the server updates the linked lot and inventory.
                      </p>
                      <ul className="space-y-2">
                        {existingKaantas.map((kaanta) => {
                          const sauda = getSaudaById(kaanta.sauda_id);
                          const isEditing = editingKaantaId === kaanta.id && editDraft !== null;
                          return (
                            <li
                              key={kaanta.id}
                              className="rounded-lg border border-border/80 bg-card/50 overflow-hidden"
                            >
                              <div className="flex items-start justify-between gap-2 px-3 py-2.5 border-b border-border/60 bg-muted/20">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-sm font-medium leading-snug">
                                      {sauda ? getSaudaDisplayName(sauda) : 'Unknown Sauda'}
                                    </span>
                                    <code className="text-[10px] px-1.5 py-0 rounded bg-muted text-muted-foreground">
                                      {kaanta.kaanta_id}
                                    </code>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={cancelEditKaanta}
                                        disabled={updatingKaantaId === kaanta.id}
                                        className="px-2 py-1 text-[11px] border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveKaantaEdit(kaanta)}
                                        disabled={updatingKaantaId === kaanta.id}
                                        className="px-2 py-1 text-[11px] bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                                      >
                                        {updatingKaantaId === kaanta.id ? 'Saving…' : 'Save'}
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => beginEditKaanta(kaanta)}
                                        disabled={updatingKaantaId !== null || deletingKaantaId !== null}
                                        className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                        title="Edit kaanta"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteKaanta(kaanta.id)}
                                        disabled={
                                          deletingKaantaId === kaanta.id ||
                                          updatingKaantaId !== null ||
                                          editingKaantaId !== null
                                        }
                                        className="p-1.5 hover:bg-destructive/10 rounded-md text-destructive transition-colors disabled:opacity-50"
                                        title="Delete kaanta"
                                      >
                                        {deletingKaantaId === kaanta.id ? (
                                          <LoadingSpinner />
                                        ) : (
                                          <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {isEditing && editDraft ? (
                                <div className="px-3 py-2.5 space-y-3 text-xs">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[10px] text-muted-foreground mb-0.5">Full (kg) *</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editDraft.full_truck_weight}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                                            updateEditDraftField('full_truck_weight', value);
                                          }
                                        }}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background ${
                                          editErrors.fullTruckWeight ? 'border-red-500' : 'border-border'
                                        }`}
                                      />
                                      {editErrors.fullTruckWeight && (
                                        <p className="text-[10px] text-red-500 mt-0.5">{editErrors.fullTruckWeight}</p>
                                      )}
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-muted-foreground mb-0.5">Empty (kg) *</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editDraft.empty_truck_weight}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                                            updateEditDraftField('empty_truck_weight', value);
                                          }
                                        }}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background ${
                                          editErrors.emptyTruckWeight ? 'border-red-500' : 'border-border'
                                        }`}
                                      />
                                      {editErrors.emptyTruckWeight && (
                                        <p className="text-[10px] text-red-500 mt-0.5">{editErrors.emptyTruckWeight}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-muted-foreground mb-0.5">
                                      Weight as per bill (kg) *
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={editDraft.said_sent_weight}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                                          updateEditDraftField('said_sent_weight', value);
                                        }
                                      }}
                                      onWheel={(e) => e.currentTarget.blur()}
                                      className={`w-full max-w-xs px-2 py-1.5 text-sm border rounded-md bg-background ${
                                        editErrors.saidSentWeight ? 'border-red-500' : 'border-border'
                                      }`}
                                    />
                                    {editErrors.saidSentWeight && (
                                      <p className="text-[10px] text-red-500 mt-0.5">{editErrors.saidSentWeight}</p>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div>
                                      <label className="block text-[10px] text-muted-foreground mb-0.5">Bag count *</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={editDraft.no_of_bags}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value === '' || (!isNaN(parseInt(value, 10)) && parseInt(value, 10) >= 0)) {
                                            updateEditDraftField('no_of_bags', value);
                                          }
                                        }}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background ${
                                          editErrors.noOfBags ? 'border-red-500' : 'border-border'
                                        }`}
                                      />
                                      {editErrors.noOfBags && (
                                        <p className="text-[10px] text-red-500 mt-0.5">{editErrors.noOfBags}</p>
                                      )}
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-muted-foreground mb-0.5">
                                        Bag weight (auto)
                                      </label>
                                      <div
                                        className={`w-full px-2 py-1.5 text-sm border rounded-md bg-muted/50 tabular-nums ${
                                          editErrors.bagWeight ? 'border-red-500' : 'border-border'
                                        }`}
                                      >
                                        {editDraft.bag_weight ? `${editDraft.bag_weight} kg` : '—'}
                                      </div>
                                      {editErrors.bagWeight && (
                                        <p className="text-[10px] text-red-500 mt-0.5">{editErrors.bagWeight}</p>
                                      )}
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-muted-foreground mb-0.5">Bag type *</label>
                                      <CustomSelect
                                        value={editDraft.bag_type}
                                        onChange={(value) => updateEditDraftField('bag_type', value as BagType)}
                                        options={KAANTA_BAG_TYPE_OPTIONS.map((o) => ({
                                          value: o.value,
                                          label: o.label,
                                        }))}
                                        placeholder="Type"
                                        allowClear={false}
                                      />
                                    </div>
                                  </div>
                                  <div className="text-[11px] tabular-nums text-muted-foreground">
                                    Net (preview):{' '}
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                      {calculateKaantaWeight(editDraft).toFixed(2)} kg
                                    </span>
                                    {sauda && sauda.quantity != null && (
                                      <span className="ml-2">
                                        (Headroom for this sauda:{' '}
                                        {(
                                          calculateRemainingWeight(sauda.quantity, sauda.received_until_now)! +
                                          kaanta.kaanta_weight
                                        ).toFixed(2)}{' '}
                                        kg incl. this kaanta)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                              <div className="px-3 py-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-2 text-xs tabular-nums">
                                <div>
                                  <div className="text-muted-foreground">Full</div>
                                  <div className="font-medium">{kaanta.full_truck_weight} kg</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Empty</div>
                                  <div className="font-medium">{kaanta.empty_truck_weight} kg</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Net</div>
                                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">{kaanta.kaanta_weight} kg</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Bill</div>
                                  <div className="font-medium">{kaanta.said_sent_weight != null ? `${kaanta.said_sent_weight} kg` : '—'}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Bag wt</div>
                                  <div className="font-medium">{kaanta.bag_weight} kg</div>
                                </div>
                                <div className="col-span-2 sm:col-span-1 lg:col-span-1">
                                  <div className="text-muted-foreground">Bags</div>
                                  <div className="font-medium">
                                    {kaanta.no_of_bags}{' '}
                                    <span className="text-muted-foreground font-normal">
                                      ({formatKaantaBagTypeLabel(kaanta.bag_type)})
                                    </span>
                                  </div>
                                </div>
                              </div>
                              )}

                              <div className="px-3 pb-2.5 pt-0 flex gap-2">
                                <div className="flex-1 min-w-0">
                                  {kaanta.khaali_kaanta_parchi_url ? (
                                    <button
                                      type="button"
                                      onClick={() => handleViewImage(kaanta, 'khaali')}
                                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] rounded-md border border-border bg-background hover:bg-muted/80 transition-colors"
                                    >
                                      <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                                      Khaali parchi
                                    </button>
                                  ) : (
                                    <label className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] rounded-md border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors">
                                      <Upload className="h-3.5 w-3.5 shrink-0" />
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleImageUpload(kaanta.id, 'khaali', file);
                                        }}
                                        disabled={uploadingImage[`${kaanta.id}-khaali`]}
                                      />
                                      {uploadingImage[`${kaanta.id}-khaali`] ? 'Uploading…' : 'Khaali parchi'}
                                    </label>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {kaanta.bhara_kaanta_parchi_url ? (
                                    <button
                                      type="button"
                                      onClick={() => handleViewImage(kaanta, 'bhara')}
                                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] rounded-md border border-border bg-background hover:bg-muted/80 transition-colors"
                                    >
                                      <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                                      Bhara parchi
                                    </button>
                                  ) : (
                                    <label className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] rounded-md border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors">
                                      <Upload className="h-3.5 w-3.5 shrink-0" />
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleImageUpload(kaanta.id, 'bhara', file);
                                        }}
                                        disabled={uploadingImage[`${kaanta.id}-bhara`]}
                                      />
                                      {uploadingImage[`${kaanta.id}-bhara`] ? 'Uploading…' : 'Bhara parchi'}
                                    </label>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Pending Kaantas Form */}
                  {kaantaEntries.length > 0 ? (
                    <>
                      <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Add kaanta ({kaantaEntries.length} pending)
                            </h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                              Each entry creates a lot. Net weight = full − empty. Enter bag count; bag weight is auto from net ÷ bags, rounded up to the nearest greater whole kg (ceil).
                            </p>
                          </div>
                        </div>

                        {kaantaEntries.map((entry, index) => {
                          const sauda = getSaudaById(entry.sauda_id);
                          const kaantaWeight = calculateKaantaWeight(entry);
                          const entryErrors = errors[index] || {};
                          const isFilled = isEntryFilled(entry);
                          const remaining = sauda ? calculateRemainingWeight(sauda.quantity, sauda.received_until_now) : null;
                          const completionStatus = sauda ? getCompletionStatus(sauda.completion_percentage) : null;

                          return (
                            <div
                              key={entry.sauda_id}
                              className={`rounded-lg border transition-colors ${
                                !entry.isEnabled
                                  ? 'border-border/60 bg-muted/20 opacity-70'
                                  : isFilled
                                    ? 'border-emerald-500/35 bg-emerald-500/[0.04]'
                                    : 'border-border/80 bg-card/30'
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2 px-3 pt-3 pb-2">
                                <div className="flex items-start gap-2 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleEntry(index)}
                                    className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                      entry.isEnabled
                                        ? 'bg-primary border-primary text-primary-foreground'
                                        : 'border-border bg-background'
                                    }`}
                                    aria-pressed={entry.isEnabled}
                                  >
                                    {entry.isEnabled && <Check className="h-3 w-3" />}
                                  </button>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                      <span className="text-sm font-medium">
                                        {sauda ? getSaudaDisplayName(sauda) : 'Unknown Sauda'}
                                      </span>
                                      {isFilled && entry.isEnabled && (
                                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                          Ready
                                        </span>
                                      )}
                                    </div>
                                    {sauda && (
                                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                        {sauda.quantity ? (
                                          <span>{formatWeightDisplay(sauda.received_until_now, sauda.quantity)}</span>
                                        ) : (
                                          <span>Received {sauda.received_until_now.toFixed(2)} kg</span>
                                        )}
                                        {completionStatus && (
                                          <span
                                            className={`rounded px-1 py-0 ${completionStatus.bgColor} ${completionStatus.color}`}
                                          >
                                            {formatCompletionPercentage(sauda.completion_percentage)}
                                          </span>
                                        )}
                                        {remaining !== null && entry.isEnabled && (
                                          <span className="text-foreground/90">
                                            Remaining <span className="tabular-nums font-medium">{remaining.toFixed(2)} kg</span>
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {entry.isEnabled && (
                                  <div className="text-right shrink-0">
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Net</div>
                                    <div className="text-sm font-semibold tabular-nums text-primary">{kaantaWeight.toFixed(2)} kg</div>
                                  </div>
                                )}
                              </div>

                              {entry.isEnabled && (
                                <div className="px-3 pb-3 space-y-3">
                                  <div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                                      Weighbridge
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="block text-[11px] text-muted-foreground mb-0.5">Full (kg) *</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={entry.full_truck_weight}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                                              updateEntry(index, 'full_truck_weight', value);
                                            }
                                          }}
                                          onWheel={(e) => e.currentTarget.blur()}
                                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md bg-background ${
                                            entryErrors.fullTruckWeight ? 'border-red-500' : 'border-border'
                                          }`}
                                          placeholder="5000"
                                        />
                                        {entryErrors.fullTruckWeight && (
                                          <p className="text-[10px] text-red-500 mt-0.5">{entryErrors.fullTruckWeight}</p>
                                        )}
                                      </div>
                                      <div>
                                        <label className="block text-[11px] text-muted-foreground mb-0.5">Empty (kg) *</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={entry.empty_truck_weight}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                                              updateEntry(index, 'empty_truck_weight', value);
                                            }
                                          }}
                                          onWheel={(e) => e.currentTarget.blur()}
                                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md bg-background ${
                                            entryErrors.emptyTruckWeight ? 'border-red-500' : 'border-border'
                                          }`}
                                          placeholder="2000"
                                        />
                                        {entryErrors.emptyTruckWeight && (
                                          <p className="text-[10px] text-red-500 mt-0.5">{entryErrors.emptyTruckWeight}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] text-muted-foreground mb-0.5">
                                      Weight as per bill (kg) *
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={entry.said_sent_weight}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                                          updateEntry(index, 'said_sent_weight', value);
                                        }
                                      }}
                                      onWheel={(e) => e.currentTarget.blur()}
                                      className={`w-full max-w-xs px-2.5 py-1.5 text-sm border rounded-md bg-background ${
                                        entryErrors.saidSentWeight ? 'border-red-500' : 'border-border'
                                      }`}
                                      placeholder="0.00"
                                    />
                                    {entryErrors.saidSentWeight && (
                                      <p className="text-[10px] text-red-500 mt-0.5">{entryErrors.saidSentWeight}</p>
                                    )}
                                  </div>

                                  <div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                                      Bags
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <div>
                                        <label className="block text-[11px] text-muted-foreground mb-0.5">
                                          Count <span className="normal-case text-muted-foreground/80">(manual) *</span>
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          value={entry.no_of_bags}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '' || (!isNaN(parseInt(value)) && parseInt(value) >= 0)) {
                                              updateEntry(index, 'no_of_bags', value);
                                            }
                                          }}
                                          onWheel={(e) => e.currentTarget.blur()}
                                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md bg-background ${
                                            entryErrors.noOfBags ? 'border-red-500' : 'border-border'
                                          }`}
                                          placeholder="e.g. 599"
                                        />
                                        {entryErrors.noOfBags && (
                                          <p className="text-[10px] text-red-500 mt-0.5">{entryErrors.noOfBags}</p>
                                        )}
                                      </div>
                                      <div>
                                        <label className="block text-[11px] text-muted-foreground mb-0.5">
                                          Bag weight <span className="normal-case text-muted-foreground/80">(auto)</span>
                                        </label>
                                        <div
                                          className={`w-full px-2.5 py-1.5 text-sm border rounded-md bg-muted/50 tabular-nums ${
                                            entryErrors.bagWeight ? 'border-red-500' : 'border-border'
                                          }`}
                                        >
                                          {entry.bag_weight ? `${entry.bag_weight} kg` : '—'}
                                        </div>
                                        {entryErrors.bagWeight && (
                                          <p className="text-[10px] text-red-500 mt-0.5">{entryErrors.bagWeight}</p>
                                        )}
                                        {(() => {
                                          const kw = calculateKaantaWeight(entry);
                                          const bags = parseInt(entry.no_of_bags, 10);
                                          const bw = parseFloat(entry.bag_weight);
                                          if (kw <= 0 || !bags || bags <= 0 || !entry.bag_weight || isNaN(bw)) {
                                            return null;
                                          }
                                          const rawPerBag = kw / bags;
                                          const ceiled = ceilToNearestGreaterWholeKg(rawPerBag);
                                          if (ceiled === null || Math.abs(ceiled - bw) > 1e-6) return null;
                                          if (Math.abs(rawPerBag - ceiled) < 1e-6) return null;
                                          return (
                                            <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1 leading-snug">
                                              Rounded: raw {rawPerBag.toFixed(2)} kg/bag → {ceiled} kg (ceil, smallest whole kg ≥ raw).
                                            </p>
                                          );
                                        })()}
                                      </div>
                                      <div className="sm:col-span-1 col-span-1">
                                        <label className="block text-[11px] text-muted-foreground mb-0.5">Bag type *</label>
                                        <CustomSelect
                                          value={entry.bag_type}
                                          onChange={(value) => updateEntry(index, 'bag_type', value as BagType)}
                                          options={KAANTA_BAG_TYPE_OPTIONS.map((o) => ({
                                            value: o.value,
                                            label: o.label,
                                          }))}
                                          placeholder="Type"
                                          allowClear={false}
                                        />
                                      </div>
                                    </div>
                                    {(() => {
                                      const meta = KAANTA_BAG_TYPE_OPTIONS.find((o) => o.value === entry.bag_type);
                                      if (!meta) return null;
                                      return (
                                        <p className="mt-1.5 text-[10px] text-muted-foreground leading-snug">
                                          {meta.description}
                                          {meta.typicalCapacity ? ` ${meta.typicalCapacity}.` : ''}
                                        </p>
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}

                              {!entry.isEnabled && (
                                <p className="px-3 pb-3 text-[11px] text-muted-foreground">Enable to enter weights.</p>
                              )}
                            </div>
                          );
                        })}

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center pt-2 border-t border-border/60">
                          <span className="text-xs text-muted-foreground">
                            {filledCount > 0
                              ? `${filledCount} to create`
                              : 'Enable and fill at least one sauda'}
                          </span>
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => onOpenChange(false)}
                              className="px-3 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
                            >
                              Close
                            </button>
                            <button
                              type="submit"
                              disabled={loading || filledCount === 0}
                              className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                              {loading
                                ? 'Creating…'
                                : filledCount === 0
                                  ? 'Create'
                                  : filledCount === 1
                                    ? 'Create 1 kaanta'
                                    : `Create ${filledCount} kaantas`}
                            </button>
                          </div>
                        </div>
                      </form>
                    </>
                  ) : existingKaantas.length > 0 ? (
                    <div className="text-center py-6">
                      <Check className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                      <p className="text-lg font-semibold text-emerald-600">All Saudas Completed!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        All saudas in this ISP have kaanta measurements.
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="mt-4 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      No saudas linked to this ISP
                    </div>
                  )}
                </>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
      />

      <DocumentViewerModal
        open={documentViewerOpen}
        onOpenChange={setDocumentViewerOpen}
        document={viewerDocuments[0] || null}
        documents={viewerDocuments}
      />
    </>
  );
}
