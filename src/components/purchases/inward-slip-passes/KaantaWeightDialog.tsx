import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, Scale, Package, Info, Check, Circle, Eye, Trash2 } from 'lucide-react';
import { kaantasAPI } from '../../../services/kaantas.api';
import { saudasAPI } from '../../../services/saudas.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { getRiceTypeLabel } from '../../../utils/riceType';
import type { InwardSlipPass, Sauda, RiceCode, RiceType, BagType, CreateKaantaRequest, Kaanta } from '../../../types/entities';

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
  bag_weight: string;
  no_of_bags: string;
  bag_type: BagType;
  isEnabled: boolean;
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

  // Load data when dialog opens
  useEffect(() => {
    if (open && isp) {
      fetchData();
    }
  }, [open, isp]);

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
          bag_weight: '',
          no_of_bags: '',
          bag_type: 'jute' as BagType,
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
    parts.push(`₹${sauda.rate}/kg`);
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
    return !!(entry.full_truck_weight && entry.empty_truck_weight && entry.bag_weight);
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
    const entry = newEntries[index];
    
    newEntries[index] = { ...entry, [field]: value };
    
    // Auto-calculate bags when bag_weight changes
    if (field === 'bag_weight' && typeof value === 'string') {
      const sauda = getSaudaById(entry.sauda_id);
      const bagWeight = parseFloat(value);
      if (sauda && sauda.quantity && bagWeight > 0) {
        const calculatedBags = Math.ceil(sauda.quantity / bagWeight);
        newEntries[index] = { ...newEntries[index], no_of_bags: calculatedBags.toString() };
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

      if (!entry.bag_weight || isNaN(bagWt) || bagWt <= 0) {
        entryErrors.bagWeight = 'Required and must be > 0';
        isValid = false;
      }

      if (!entry.no_of_bags || isNaN(bags) || bags <= 0) {
        entryErrors.noOfBags = 'Required and must be > 0';
        isValid = false;
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
      
      // Refresh data to show newly created kaantas
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

  const handleDeleteKaanta = async (kaantaId: string) => {
    setDeletingKaantaId(kaantaId);
    try {
      await kaantasAPI.deleteKaanta(kaantaId);
      setAlertType('success');
      setAlertTitle('Deleted');
      setAlertMessage('Kaanta and associated lot deleted successfully');
      setAlertOpen(true);
      
      // Refresh data
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

  const filledCount = getFilledEntries().length;

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-3xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Scale className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                      Kaantas
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-muted-foreground mt-1">
                      {isp?.slip_number} • {isp?.party_name}
                    </Dialog.Description>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Completion Progress */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Kaanta Completion</span>
                  <span className="text-sm font-bold text-primary">{completionPercentage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 mb-3">
                  <div 
                    className={`h-2.5 rounded-full transition-all ${
                      completionPercentage === 100 ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {saudas.map((sauda) => {
                    const hasKaanta = existingKaantas.some(k => k.sauda_id === sauda.id);
                    return (
                      <div 
                        key={sauda.id} 
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                          hasKaanta 
                            ? 'bg-emerald-500/10 text-emerald-600' 
                            : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        {hasKaanta ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                        {getSaudaDisplayName(sauda).split(' - ')[0]}
                      </div>
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
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500" />
                        Created Kaantas ({existingKaantas.length})
                      </h3>
                      <div className="space-y-3">
                        {existingKaantas.map((kaanta) => {
                          const sauda = getSaudaById(kaanta.sauda_id);
                          return (
                            <div 
                              key={kaanta.id} 
                              className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-emerald-600" />
                                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                    {sauda ? getSaudaDisplayName(sauda) : 'Unknown Sauda'}
                                  </span>
                                  <span className="text-xs bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full">
                                    {kaanta.kaanta_id}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteKaanta(kaanta.id)}
                                  disabled={deletingKaantaId === kaanta.id}
                                  className="p-1.5 hover:bg-red-500/10 rounded text-red-500 transition-colors disabled:opacity-50"
                                  title="Delete Kaanta"
                                >
                                  {deletingKaantaId === kaanta.id ? (
                                    <LoadingSpinner />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                                <div>
                                  <div className="text-xs text-muted-foreground">Full Wt</div>
                                  <div className="font-medium">{kaanta.full_truck_weight} kg</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Empty Wt</div>
                                  <div className="font-medium">{kaanta.empty_truck_weight} kg</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Kaanta Wt</div>
                                  <div className="font-bold text-emerald-600">{kaanta.kaanta_weight} kg</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Bags</div>
                                  <div className="font-medium">{kaanta.no_of_bags} ({kaanta.bag_type})</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Amount</div>
                                  <div className="font-bold text-primary">
                                    ₹{sauda ? (kaanta.kaanta_weight * sauda.rate).toFixed(2) : '-'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Pending Kaantas Form */}
                  {kaantaEntries.length > 0 ? (
                    <>
                      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3">
                        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-600 dark:text-blue-400">
                          <p className="font-medium">Create New Kaantas</p>
                          <p className="text-xs mt-1 text-muted-foreground">
                            Each kaanta creates a lot automatically. Fill only the saudas you want. Bags are auto-calculated from sauda quantity ÷ bag weight.
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Circle className="h-4 w-4 text-amber-500" />
                          Pending Saudas ({kaantaEntries.length})
                        </h3>

                        {kaantaEntries.map((entry, index) => {
                          const sauda = getSaudaById(entry.sauda_id);
                          const kaantaWeight = calculateKaantaWeight(entry);
                          const entryErrors = errors[index] || {};
                          const isFilled = isEntryFilled(entry);
                          
                          return (
                            <div 
                              key={entry.sauda_id} 
                              className={`border rounded-lg p-4 transition-all ${
                                !entry.isEnabled 
                                  ? 'border-border/50 bg-muted/30 opacity-60' 
                                  : isFilled 
                                    ? 'border-emerald-500/50 bg-emerald-500/5' 
                                    : 'border-border'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleEntry(index)}
                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                      entry.isEnabled 
                                        ? 'bg-primary border-primary text-primary-foreground' 
                                        : 'border-border bg-background'
                                    }`}
                                  >
                                    {entry.isEnabled && <Check className="h-3 w-3" />}
                                  </button>
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{sauda ? getSaudaDisplayName(sauda) : 'Unknown Sauda'}</span>
                                    {sauda?.quantity && (
                                      <span className="text-xs text-muted-foreground">
                                        (Qty: {sauda.quantity} kg)
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isFilled && entry.isEnabled && (
                                  <span className="text-xs bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full">
                                    Ready
                                  </span>
                                )}
                              </div>

                              {entry.isEnabled && (
                                <>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium mb-1">Full Wt (kg) *</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={entry.full_truck_weight}
                                        onChange={(e) => updateEntry(index, 'full_truck_weight', e.target.value)}
                                        className={`w-full px-2 py-1.5 text-sm border rounded bg-background ${
                                          entryErrors.fullTruckWeight ? 'border-red-500' : 'border-border'
                                        }`}
                                        placeholder="5000"
                                      />
                                      {entryErrors.fullTruckWeight && (
                                        <p className="text-[10px] text-red-500 mt-0.5">{entryErrors.fullTruckWeight}</p>
                                      )}
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium mb-1">Empty Wt (kg) *</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={entry.empty_truck_weight}
                                        onChange={(e) => updateEntry(index, 'empty_truck_weight', e.target.value)}
                                        className={`w-full px-2 py-1.5 text-sm border rounded bg-background ${
                                          entryErrors.emptyTruckWeight ? 'border-red-500' : 'border-border'
                                        }`}
                                        placeholder="2000"
                                      />
                                      {entryErrors.emptyTruckWeight && (
                                        <p className="text-[10px] text-red-500 mt-0.5">{entryErrors.emptyTruckWeight}</p>
                                      )}
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium mb-1">Bag Wt (kg) *</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={entry.bag_weight}
                                        onChange={(e) => updateEntry(index, 'bag_weight', e.target.value)}
                                        className={`w-full px-2 py-1.5 text-sm border rounded bg-background ${
                                          entryErrors.bagWeight ? 'border-red-500' : 'border-border'
                                        }`}
                                        placeholder="50"
                                      />
                                      {entryErrors.bagWeight && (
                                        <p className="text-[10px] text-red-500 mt-0.5">{entryErrors.bagWeight}</p>
                                      )}
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium mb-1">
                                        Bags <span className="text-muted-foreground">(auto)</span>
                                      </label>
                                      <input
                                        type="number"
                                        value={entry.no_of_bags}
                                        onChange={(e) => updateEntry(index, 'no_of_bags', e.target.value)}
                                        className={`w-full px-2 py-1.5 text-sm border rounded bg-background ${
                                          entryErrors.noOfBags ? 'border-red-500' : 'border-border'
                                        }`}
                                        placeholder="Auto"
                                      />
                                      {entryErrors.noOfBags && (
                                        <p className="text-[10px] text-red-500 mt-0.5">{entryErrors.noOfBags}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-3 flex items-center justify-between">
                                    <select
                                      value={entry.bag_type}
                                      onChange={(e) => updateEntry(index, 'bag_type', e.target.value)}
                                      className="px-2 py-1 text-xs border border-border rounded bg-background"
                                    >
                                      <option value="jute">Jute Bag</option>
                                      <option value="pp">PP Bag</option>
                                    </select>
                                    <div className="text-right">
                                      <div className="text-xs text-muted-foreground">Kaanta Weight</div>
                                      <div className="font-bold text-primary">{kaantaWeight.toFixed(2)} kg</div>
                                      {sauda && kaantaWeight > 0 && (
                                        <div className="text-xs text-emerald-600">
                                          ≈ ₹{(kaantaWeight * sauda.rate).toFixed(2)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}

                              {!entry.isEnabled && (
                                <p className="text-xs text-muted-foreground">
                                  Click checkbox to enable this sauda
                                </p>
                              )}
                            </div>
                          );
                        })}

                        <div className="flex justify-between items-center pt-4">
                          <span className="text-sm text-muted-foreground">
                            {filledCount > 0 
                              ? `${filledCount} kaanta${filledCount > 1 ? 's' : ''} ready to create`
                              : 'Fill at least one sauda to continue'
                            }
                          </span>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => onOpenChange(false)}
                              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                            >
                              Close
                            </button>
                            <button
                              type="submit"
                              disabled={loading || filledCount === 0}
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                              {loading ? 'Creating...' : `Create ${filledCount || ''} Kaanta${filledCount !== 1 ? 's' : ''}`}
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
    </>
  );
}
