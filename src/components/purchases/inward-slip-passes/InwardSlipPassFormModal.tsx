import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect } from 'react';
import { X, FileText, Check, Loader2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInwardSlipPasses } from '../../../hooks/useInwardSlipPasses';
import { inwardSlipPassesAPI } from '../../../services/inwardSlipPasses.api';
import { useSaudas } from '../../../hooks/useSaudas';
import { useVendors } from '../../../hooks/useVendors';
import { useTransporters } from '../../../hooks/useTransporters';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { getRiceTypeLabel } from '../../../utils/riceType';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import type { CreateInwardSlipPassRequest, UpdateInwardSlipPassRequest, InwardSlipPass, RiceCode, RiceType, Sauda } from '../../../types/entities';

interface FileUploadState {
  bill_image: File | null;
  transportation_bill: File | null;
  purchase_bill: File | null;
  bilti: File | null;
  eway_bill: File | null;
}

interface InwardSlipPassFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ispId?: string | null;
}

export function InwardSlipPassFormModal({ open, onOpenChange, ispId }: InwardSlipPassFormModalProps) {
  const navigate = useNavigate();
  const { createInwardSlipPass, updateInwardSlipPass } = useInwardSlipPasses();
  const { saudas } = useSaudas();
  const { vendors } = useVendors();
  const { transporters } = useTransporters();
  const isEditMode = !!ispId;
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);

  useEffect(() => {
    const fetchRiceCodes = async () => {
      try {
        const data = await riceCodesAPI.getAllRiceCodes();
        setRiceCodes(data);
      } catch (error) {
        console.error('Failed to fetch rice codes:', error);
      }
    };
    const fetchRiceTypes = async () => {
      try {
        const data = await riceCodesAPI.getRiceTypes();
        setRiceTypes(data);
      } catch (error) {
        console.error('Failed to fetch rice types:', error);
      }
    };
    if (open) {
      fetchRiceCodes();
      fetchRiceTypes();
    }
  }, [open]);

  const getRiceCodeName = (riceCodeId: string | null | undefined): string => {
    if (!riceCodeId) return '';
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === riceCodeId);
    return riceCode ? riceCode.rice_code_name : '';
  };

  const getPurchaserName = (purchaserId: string | null | undefined): string => {
    if (!purchaserId) return '';
    const purchaser = vendors.find((v) => v.id === purchaserId);
    return purchaser ? purchaser.business_name : '';
  };

  const getSaudaDisplayName = (sauda: Sauda): string => {
    const parts: string[] = [];
    
    const purchaserName = getPurchaserName(sauda.purchaser_id);
    if (purchaserName) parts.push(purchaserName);
    
    const riceCodeName = getRiceCodeName(sauda.rice_code_id);
    if (riceCodeName) parts.push(riceCodeName);
    
    const riceTypeLabel = getRiceTypeLabel(sauda.rice_type, riceTypes);
    if (riceTypeLabel) parts.push(riceTypeLabel);
    
    return parts.join(' - ') || 'Sauda';
  };
  const [formData, setFormData] = useState<CreateInwardSlipPassRequest>({
    sauda_ids: [],
    slip_number: '',
    date: new Date().toISOString().split('T')[0],
    vehicle_number: '',
    party_name: '',
    party_address: null,
    party_gst_number: null,
    party_pan_number: null,
    transporter_id: null,
    transportation_cost: null,
    notes: null,
  });
  const [pendingFiles, setPendingFiles] = useState<FileUploadState>({
    bill_image: null,
    transportation_bill: null,
    purchase_bill: null,
    bilti: null,
    eway_bill: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingISP, setLoadingISP] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadSuccess, setUploadSuccess] = useState<Record<string, boolean>>({});
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (open && ispId && isEditMode) {
      loadISPData();
    } else if (open && !ispId) {
      resetForm();
    }
  }, [open, ispId]);

  const loadISPData = async () => {
    if (!ispId) return;
    setLoadingISP(true);
    try {
      const isp = await inwardSlipPassesAPI.getInwardSlipPassById(ispId);
      setFormData({
        sauda_ids: isp.sauda_ids || [],
        slip_number: isp.slip_number,
        date: isp.date,
        vehicle_number: isp.vehicle_number,
        party_name: isp.party_name,
        party_address: isp.party_address || null,
        party_gst_number: isp.party_gst_number || null,
        party_pan_number: isp.party_pan_number || null,
        transporter_id: isp.transporter_id || null,
        transportation_cost: isp.transportation_cost || null,
        notes: isp.notes || null,
      });
      setErrors({});
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to load ISP data');
      setAlertOpen(true);
    } finally {
      setLoadingISP(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sauda_ids: [],
      slip_number: '',
      date: new Date().toISOString().split('T')[0],
      vehicle_number: '',
      party_name: '',
      party_address: null,
      party_gst_number: null,
      party_pan_number: null,
      transporter_id: null,
      transportation_cost: null,
      notes: null,
    });
    setPendingFiles({
      bill_image: null,
      transportation_bill: null,
      purchase_bill: null,
      bilti: null,
      eway_bill: null,
    });
    setUploadSuccess({});
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.sauda_ids || formData.sauda_ids.length === 0) {
      newErrors.sauda_ids = 'At least one sauda is required';
    }
    if (!formData.slip_number.trim()) {
      newErrors.slip_number = 'Slip number is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.vehicle_number.trim()) {
      newErrors.vehicle_number = 'Vehicle number is required';
    }
    if (!formData.party_name.trim()) {
      newErrors.party_name = 'Party name is required';
    }
    if (formData.transportation_cost && formData.transportation_cost < 0) {
      newErrors.transportation_cost = 'Transportation cost cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadPendingFiles = async (newIspId: string) => {
    const uploadPromises: Promise<void>[] = [];
    const fileFields = Object.keys(pendingFiles) as (keyof FileUploadState)[];
    
    for (const field of fileFields) {
      const file = pendingFiles[field];
      if (file) {
        uploadPromises.push(
          (async () => {
            try {
              await handleFileUpload(field, file, newIspId);
            } catch (error) {
              console.error(`Failed to upload ${field}:`, error);
            }
          })()
        );
      }
    }
    
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isEditMode && ispId) {
        await updateInwardSlipPass(ispId, formData as UpdateInwardSlipPassRequest);
        // Upload any new pending files
        await uploadPendingFiles(ispId);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('ISP updated successfully');
      } else {
        const newISP = await createInwardSlipPass(formData);
        // Upload pending files after creation
        if (newISP && newISP.id) {
          await uploadPendingFiles(newISP.id);
        }
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('ISP created successfully');
      }
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to save ISP');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (field: string, file: File, targetIspId?: string) => {
    const uploadIspId = targetIspId || ispId;
    if (!uploadIspId) {
      // Store file for later upload after creation
      setPendingFiles(prev => ({ ...prev, [field]: file }));
      return;
    }

    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      let uploadFn;
      switch (field) {
        case 'bill_image':
          uploadFn = inwardSlipPassesAPI.uploadBillImage;
          break;
        case 'transportation_bill':
          uploadFn = inwardSlipPassesAPI.uploadTransportationBill;
          break;
        case 'purchase_bill':
          uploadFn = inwardSlipPassesAPI.uploadPurchaseBill;
          break;
        case 'bilti':
          uploadFn = inwardSlipPassesAPI.uploadBilti;
          break;
        case 'eway_bill':
          uploadFn = inwardSlipPassesAPI.uploadEwayBill;
          break;
        default:
          throw new Error('Unknown upload field');
      }
      await uploadFn(uploadIspId, file);
      setUploadSuccess(prev => ({ ...prev, [field]: true }));
      if (isEditMode) {
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Document uploaded successfully');
        setAlertOpen(true);
      }
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to upload document');
      setAlertOpen(true);
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleFileSelect = (field: keyof FileUploadState, file: File | null) => {
    if (!file) return;
    
    if (isEditMode && ispId) {
      // In edit mode, upload immediately
      handleFileUpload(field, file);
    } else {
      // In create mode, store for later
      setPendingFiles(prev => ({ ...prev, [field]: file }));
    }
  };

  const toggleSaudaSelection = (saudaId: string) => {
    setFormData(prev => {
      const currentIds = prev.sauda_ids || [];
      const isAdding = !currentIds.includes(saudaId);
      const newIds = isAdding
        ? [...currentIds, saudaId]
        : currentIds.filter(id => id !== saudaId);
      
      // If adding a sauda and party details are empty, fill from the sauda's vendor
      if (isAdding) {
        const selectedSauda = saudas.find(s => s.id === saudaId);
        if (selectedSauda) {
          const vendor = vendors.find(v => v.id === selectedSauda.purchaser_id);
          if (vendor) {
            // Only fill if party fields are empty
            const updates: Partial<CreateInwardSlipPassRequest> = { sauda_ids: newIds };
            
            if (!prev.party_name || prev.party_name.trim() === '') {
              updates.party_name = vendor.business_name;
            }
            
            if (!prev.party_address || prev.party_address.trim() === '') {
              const addressParts = [
                vendor.address.street,
                vendor.address.city,
                vendor.address.state,
                vendor.address.pincode,
                vendor.address.country
              ].filter(Boolean);
              updates.party_address = addressParts.join(', ') || null;
            }
            
            if (!prev.party_gst_number || prev.party_gst_number.trim() === '') {
              updates.party_gst_number = vendor.business_details.gst_number || null;
            }
            
            if (!prev.party_pan_number || prev.party_pan_number.trim() === '') {
              updates.party_pan_number = vendor.business_details.pan_number || null;
            }
            
            return { ...prev, ...updates };
          }
        }
      }
      
      return { ...prev, sauda_ids: newIds };
    });
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                  {isEditMode ? 'Edit Inward Slip Pass' : 'Create Inward Slip Pass'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingISP ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Sauda Selection - First Row */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Saudas <span className="text-red-500">*</span>
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
                      {saudas.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No saudas available</p>
                      ) : (
                        saudas.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={(formData.sauda_ids || []).includes(s.id)}
                              onChange={() => toggleSaudaSelection(s.id)}
                              disabled={isEditMode}
                              className="rounded"
                            />
                            <span className="text-sm">
                              {getSaudaDisplayName(s)} - ₹{s.rate}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    {errors.sauda_ids && (
                      <p className="text-xs text-red-500 mt-1">{errors.sauda_ids}</p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border my-4"></div>

                  {/* Slip Number and Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Slip Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.slip_number}
                        onChange={(e) => setFormData({ ...formData, slip_number: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.slip_number ? 'border-red-500' : 'border-border'
                        }`}
                        placeholder="ISP-001"
                      />
                      {errors.slip_number && (
                        <p className="text-xs text-red-500 mt-1">{errors.slip_number}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg bg-background ${
                          errors.date ? 'border-red-500' : 'border-border'
                        }`}
                      />
                      {errors.date && (
                        <p className="text-xs text-red-500 mt-1">{errors.date}</p>
                      )}
                    </div>
                  </div>

                  {/* Party Details Section */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Party Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          Party Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.party_name}
                          onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-lg bg-background ${
                            errors.party_name ? 'border-red-500' : 'border-border'
                          }`}
                          placeholder="Party Name"
                        />
                        {errors.party_name && (
                          <p className="text-xs text-red-500 mt-1">{errors.party_name}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1">Party Address</label>
                        <textarea
                          value={formData.party_address || ''}
                          onChange={(e) => setFormData({ ...formData, party_address: e.target.value || null })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                          rows={2}
                          placeholder="Party Address"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Party GST Number</label>
                        <input
                          type="text"
                          value={formData.party_gst_number || ''}
                          onChange={(e) => setFormData({ ...formData, party_gst_number: e.target.value || null })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                          placeholder="27ABCDE1234F1Z5"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Party PAN Number</label>
                        <input
                          type="text"
                          value={formData.party_pan_number || ''}
                          onChange={(e) => setFormData({ ...formData, party_pan_number: e.target.value || null })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                          placeholder="ABCDE1234F"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Transporter Details Section */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Transporter Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Transporter</label>
                        <div className="flex gap-2">
                          <select
                            value={formData.transporter_id || ''}
                            onChange={(e) => {
                              if (e.target.value === '__add_new__') {
                                navigate('/directory/transporters');
                                // Reset to empty after navigation
                                setTimeout(() => {
                                  const select = e.target as HTMLSelectElement;
                                  select.value = '';
                                }, 0);
                                return;
                              }
                              
                              const transporterId = e.target.value || null;
                              // Auto-fill vehicle number from transporter if available
                              if (transporterId) {
                                const selectedTransporter = transporters.find(t => t.id === transporterId);
                                if (selectedTransporter && selectedTransporter.vehicle_numbers && selectedTransporter.vehicle_numbers.length > 0) {
                                  // Use first vehicle number if vehicle_number field is empty
                                  setFormData(prev => ({
                                    ...prev,
                                    transporter_id: transporterId,
                                    vehicle_number: prev.vehicle_number || selectedTransporter.vehicle_numbers[0] || ''
                                  }));
                                  return;
                                }
                              }
                              
                              setFormData({ ...formData, transporter_id: transporterId });
                            }}
                            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
                          >
                            <option value="">Select Transporter</option>
                            {transporters.filter(t => t.is_active).map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.business_name}
                              </option>
                            ))}
                            <option value="__add_new__" className="text-primary font-medium">+ Add New Transporter</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => navigate('/directory/transporters')}
                            className="px-3 py-2 border border-border rounded-lg bg-background hover:bg-muted transition-colors flex items-center justify-center"
                            title="Add New Transporter"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Vehicle Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.vehicle_number}
                            onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg bg-background ${
                              errors.vehicle_number ? 'border-red-500' : 'border-border'
                            }`}
                            placeholder="MH01AB1234"
                          />
                          {errors.vehicle_number && (
                            <p className="text-xs text-red-500 mt-1">{errors.vehicle_number}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Transportation Cost (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.transportation_cost || ''}
                            onChange={(e) => setFormData({ ...formData, transportation_cost: parseFloat(e.target.value) || null })}
                            className={`w-full px-3 py-2 border rounded-lg bg-background ${
                              errors.transportation_cost ? 'border-red-500' : 'border-border'
                            }`}
                            placeholder="0.00"
                          />
                          {errors.transportation_cost && (
                            <p className="text-xs text-red-500 mt-1">{errors.transportation_cost}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="pt-2">
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      rows={3}
                      placeholder="Additional notes"
                    />
                  </div>

                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Document Uploads</h3>
                      {!isEditMode && (
                        <span className="text-xs text-muted-foreground">
                          Files will be uploaded after saving
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(['bill_image', 'transportation_bill', 'purchase_bill', 'bilti', 'eway_bill'] as const).map((field) => (
                        <div key={field} className="relative">
                          <label className="block text-sm font-medium mb-1 capitalize">
                            {field.replace(/_/g, ' ')}
                          </label>
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                handleFileSelect(field, file || null);
                              }}
                              disabled={uploading[field]}
                              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                            {uploading[field] && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              </div>
                            )}
                            {uploadSuccess[field] && !uploading[field] && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Check className="h-4 w-4 text-emerald-500" />
                              </div>
                            )}
                          </div>
                          {pendingFiles[field] && !isEditMode && (
                            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {pendingFiles[field]?.name}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
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

