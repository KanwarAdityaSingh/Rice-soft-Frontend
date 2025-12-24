import * as Dialog from '@radix-ui/react-dialog';
import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Check, Loader2, Plus, Search, ChevronDown, RefreshCw, Minus, Download, Truck, Shield, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInwardSlipPasses } from '../../../hooks/useInwardSlipPasses';
import { inwardSlipPassesAPI } from '../../../services/inwardSlipPasses.api';
import { useSaudas } from '../../../hooks/useSaudas';
import { useVendors } from '../../../hooks/useVendors';
import { useTransporters } from '../../../hooks/useTransporters';
import { useVehicles } from '../../../hooks/useVehicles';
import { vehiclesAPI } from '../../../services/vehicles.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { vendorsAPI } from '../../../services/vendors.api';
import { getRiceTypeLabel } from '../../../utils/riceType';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import type { CreateInwardSlipPassRequest, UpdateInwardSlipPassRequest, InwardSlipPass, RiceCode, RiceType, Sauda, Vehicle, VehicleVerificationResponse } from '../../../types/entities';

// Default recipient type
interface DefaultRecipient {
  name: string;
  address: string;
  llpin: string;
}

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
  const { transporters, refetch: refetchTransporters, loading: loadingTransporters } = useTransporters();
  const { vehicles, refetch: refetchVehicles, loading: loadingVehicles } = useVehicles(undefined, true);
  const isEditMode = !!ispId;
  const [riceCodes, setRiceCodes] = useState<RiceCode[]>([]);
  const [riceTypes, setRiceTypes] = useState<RiceType[]>([]);
  const [defaultRecipient, setDefaultRecipient] = useState<DefaultRecipient | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Vehicle-related state
  const [vehicleNumberInput, setVehicleNumberInput] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [verifyingVehicle, setVerifyingVehicle] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VehicleVerificationResponse | null>(null);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const vehicleDropdownRef = useRef<HTMLDivElement>(null);

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
    const fetchDefaultRecipient = async () => {
      try {
        const recipient = await vendorsAPI.getDefaultRecipient();
        setDefaultRecipient(recipient);
      } catch (error) {
        console.error('Failed to fetch default recipient:', error);
      }
    };
    if (open) {
      fetchRiceCodes();
      fetchRiceTypes();
      fetchDefaultRecipient();
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
    date: new Date().toISOString().split('T')[0],
    vehicle_id: '',
    party_name: '',
    party_address: null,
    party_gst_number: null,
    party_pan_number: null,
    transporter_id: null,
    transportation_cost: null,
    notes: null,
  });
  const [displaySlipNumber, setDisplaySlipNumber] = useState<string>(''); // For display in edit mode
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
  const [saudaSearchQuery, setSaudaSearchQuery] = useState('');
  const [saudaDropdownOpen, setSaudaDropdownOpen] = useState(false);
  const saudaDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && ispId && isEditMode) {
      loadISPData();
    } else if (open && !ispId) {
      resetForm();
    }
  }, [open, ispId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (saudaDropdownRef.current && !saudaDropdownRef.current.contains(event.target as Node)) {
        setSaudaDropdownOpen(false);
      }
    };

    if (saudaDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [saudaDropdownOpen]);

  const loadISPData = async () => {
    if (!ispId) return;
    setLoadingISP(true);
    try {
      const isp = await inwardSlipPassesAPI.getInwardSlipPassById(ispId);
      setFormData({
        sauda_ids: isp.sauda_ids || [],
        date: isp.date,
        vehicle_id: isp.vehicle_id,
        party_name: isp.party_name,
        party_address: isp.party_address || null,
        party_gst_number: isp.party_gst_number || null,
        party_pan_number: isp.party_pan_number || null,
        transporter_id: isp.transporter_id || null,
        transportation_cost: isp.transportation_cost || null,
        notes: isp.notes || null,
      });
      setDisplaySlipNumber(isp.slip_number); // Store for display only
      // Load selected vehicle details
      if (isp.vehicle_id) {
        try {
          const vehicle = await vehiclesAPI.getVehicleById(isp.vehicle_id);
          setSelectedVehicle(vehicle);
          setVehicleNumberInput(vehicle.vehicle_number);
        } catch (err) {
          console.error('Failed to load vehicle:', err);
        }
      }
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
      date: new Date().toISOString().split('T')[0],
      vehicle_id: '',
      party_name: '',
      party_address: null,
      party_gst_number: null,
      party_pan_number: null,
      transporter_id: null,
      transportation_cost: null,
      notes: null,
    });
    setDisplaySlipNumber('');
    setPendingFiles({
      bill_image: null,
      transportation_bill: null,
      purchase_bill: null,
      bilti: null,
      eway_bill: null,
    });
    setUploadSuccess({});
    setErrors({});
    // Reset vehicle state
    setVehicleNumberInput('');
    setSelectedVehicle(null);
    setVerificationResult(null);
    setVehicleDropdownOpen(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.sauda_ids || formData.sauda_ids.length === 0) {
      newErrors.sauda_ids = 'At least one sauda is required';
    }
    // slip_number is auto-generated, no validation needed
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.vehicle_id) {
      newErrors.vehicle_id = 'Vehicle is required';
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
        // Remove slip_number from create request - backend will auto-generate it
        const { slip_number, ...createData } = formData;
        const newISP = await createInwardSlipPass(createData);
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

  const removeSauda = (saudaId: string) => {
    setFormData(prev => ({
      ...prev,
      sauda_ids: (prev.sauda_ids || []).filter(id => id !== saudaId)
    }));
  };

  const getFilteredSaudas = () => {
    if (!saudaSearchQuery.trim()) return saudas;
    const query = saudaSearchQuery.toLowerCase();
    return saudas.filter(sauda => {
      const displayName = getSaudaDisplayName(sauda).toLowerCase();
      const rate = sauda.rate.toString();
      return displayName.includes(query) || rate.includes(query);
    });
  };

  const getSelectedSaudas = () => {
    return saudas.filter(s => (formData.sauda_ids || []).includes(s.id));
  };

  // Get transporter name
  const getTransporterName = (transporterId: string | null): string => {
    if (!transporterId) return '-';
    const transporter = transporters.find(t => t.id === transporterId);
    return transporter ? transporter.business_name : '-';
  };

  // Get vehicle number for display
  const getVehicleNumber = (vehicleId: string | null): string => {
    if (!vehicleId) return '-';
    if (selectedVehicle && selectedVehicle.id === vehicleId) return selectedVehicle.vehicle_number;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.vehicle_number : '-';
  };

  // Filter vehicles for dropdown
  const getFilteredVehicles = () => {
    if (!vehicleSearchQuery.trim()) return vehicles;
    const query = vehicleSearchQuery.toLowerCase();
    return vehicles.filter(v => 
      v.vehicle_number.toLowerCase().includes(query) ||
      v.owner_name?.toLowerCase().includes(query) ||
      v.maker_model?.toLowerCase().includes(query)
    );
  };

  // Close vehicle dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(event.target as Node)) {
        setVehicleDropdownOpen(false);
      }
    };
    if (vehicleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [vehicleDropdownOpen]);

  // Select existing vehicle
  const selectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData(prev => ({ ...prev, vehicle_id: vehicle.id }));
    setVehicleNumberInput(vehicle.vehicle_number);
    setVehicleDropdownOpen(false);
    setVerificationResult(null);
    // Link transporter if vehicle has one
    if (vehicle.transporter_ids?.length && !formData.transporter_id) {
      setFormData(prev => ({ ...prev, transporter_id: vehicle.transporter_ids[0] }));
    }
  };

  // Verify vehicle number via Surepass
  const handleVerifyVehicle = async () => {
    if (!vehicleNumberInput.trim()) return;
    
    setVerifyingVehicle(true);
    try {
      // First check if vehicle already exists
      try {
        const existingVehicle = await vehiclesAPI.getVehicleByNumber(vehicleNumberInput.trim().toUpperCase());
        if (existingVehicle) {
          selectVehicle(existingVehicle);
          setAlertType('info');
          setAlertTitle('Vehicle Found');
          setAlertMessage('This vehicle already exists in the system.');
          setAlertOpen(true);
          setVerifyingVehicle(false);
          return;
        }
      } catch (e) {
        // Vehicle doesn't exist, continue with verification
      }

      // Verify via Surepass
      const result = await vehiclesAPI.verifyVehicle(vehicleNumberInput.trim());
      setVerificationResult(result);
      setAlertType('success');
      setAlertTitle('Vehicle Verified');
      setAlertMessage(`Owner: ${result.owner_name || 'N/A'}, Model: ${result.maker_model || 'N/A'}`);
      setAlertOpen(true);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Verification Failed');
      setAlertMessage(error.message || 'Could not verify vehicle. You can still add it manually.');
      setAlertOpen(true);
    } finally {
      setVerifyingVehicle(false);
    }
  };

  // Create vehicle from verification result or manual entry
  const handleCreateVehicle = async () => {
    if (!vehicleNumberInput.trim()) return;
    
    setVerifyingVehicle(true);
    try {
      const vehicleData = {
        vehicle_number: vehicleNumberInput.trim().toUpperCase(),
        ...(verificationResult || {}),
        transporter_ids: formData.transporter_id ? [formData.transporter_id] : [],
        is_verified: !!verificationResult,
        verified_at: verificationResult ? new Date().toISOString() : null,
        is_active: true,
      };
      
      const newVehicle = await vehiclesAPI.createVehicle(vehicleData);
      selectVehicle(newVehicle);
      await refetchVehicles();
      setAlertType('success');
      setAlertTitle('Vehicle Created');
      setAlertMessage('Vehicle added successfully.');
      setAlertOpen(true);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to create vehicle.');
      setAlertOpen(true);
    } finally {
      setVerifyingVehicle(false);
    }
  };

  // PDF Download function
  const handleDownloadPDF = () => {
    if (!previewRef.current) return;
    
    try {
      const printContent = previewRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to download the PDF');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Inward Slip Pass - ${formData.slip_number || 'ISP'}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Courier New', monospace; 
                padding: 20px;
                background: white;
                color: black;
                font-size: 11px;
              }
              .preview-container {
                max-width: 700px;
                margin: 0 auto;
                border: 2px solid #333;
                padding: 15px;
              }
              .thanks { text-align: center; font-size: 10px; margin-bottom: 20px; }
              .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 10px; margin-bottom: 15px; }
              .header h2 { font-size: 20px; margin-bottom: 3px; letter-spacing: 2px; }
              .header p { font-size: 9px; color: #666; }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; border-bottom: 1px dotted #999; }
              .info-pair { display: flex; gap: 8px; }
              .info-label { color: #666; }
              .info-value { font-weight: bold; }
              .weight-section { margin: 15px 0; }
              .weight-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dotted #999; }
              .weight-label { flex: 1; }
              .weight-value { font-weight: bold; font-size: 14px; min-width: 100px; text-align: right; }
              .weight-date { font-size: 10px; color: #666; margin-left: 20px; min-width: 150px; }
              .net-weight { background: #f5f5f5; padding: 10px; font-size: 16px; font-weight: bold; border: 2px solid #333; }
              .charges { margin-top: 15px; padding-top: 10px; border-top: 2px dashed #333; }
              .sauda-section { margin-top: 15px; padding: 10px; background: #f9f9f9; }
              .sauda-item { padding: 5px 0; border-bottom: 1px dotted #ccc; }
              @media print {
                body { padding: 0; }
                .preview-container { border: none; }
              }
            </style>
          </head>
          <body>
            <div class="preview-container">
              ${printContent}
            </div>
            <script>
              (function() {
                var printWindow = window;
                var closed = false;
                
                function closeWindow() {
                  if (!closed && printWindow && !printWindow.closed) {
                    closed = true;
                    try {
                      printWindow.close();
                    } catch (e) {
                      // Ignore errors when closing
                    }
                  }
                }
                
                // Use onafterprint event if available (more reliable)
                if (printWindow.matchMedia) {
                  var mediaQueryList = printWindow.matchMedia('print');
                  mediaQueryList.addEventListener('change', function(mql) {
                    if (!mql.matches) {
                      // Print dialog was closed
                      setTimeout(closeWindow, 100);
                    }
                  });
                }
                
                // Fallback: use onafterprint event
                printWindow.onafterprint = function() {
                  setTimeout(closeWindow, 100);
                };
                
                // Trigger print after a short delay
                setTimeout(function() {
                  printWindow.print();
                }, 250);
              })();
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const adjustDate = (days: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentDate = new Date(formData.date);
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    
    // Calculate difference from today
    const diffTime = newDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Check if new date is within allowed range (-1 to +1 from today)
    if (diffDays < -1) {
      setAlertType('warning');
      setAlertTitle('Date Restriction');
      setAlertMessage('You cannot select a date more than 1 day before today.');
      setAlertOpen(true);
      return;
    }
    
    if (diffDays > 1) {
      setAlertType('warning');
      setAlertTitle('Date Restriction');
      setAlertMessage('You cannot select a date more than 1 day after today.');
      setAlertOpen(true);
      return;
    }
    
    setFormData({ ...formData, date: newDate.toISOString().split('T')[0] });
  };

  const incrementDate = () => adjustDate(1);
  const decrementDate = () => adjustDate(-1);

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-5xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Sauda Selection */}
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Saudas <span className="text-red-500">*</span>
                    </label>
                    {getSelectedSaudas().length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {getSelectedSaudas().map((sauda) => (
                          <div key={sauda.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                            <span>{getSaudaDisplayName(sauda)} - ₹{sauda.rate}</span>
                            {!isEditMode && (
                              <button type="button" onClick={() => removeSauda(sauda.id)} className="hover:bg-primary/20 rounded-full p-0.5">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {!isEditMode && (
                      <div ref={saudaDropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setSaudaDropdownOpen(!saudaDropdownOpen)}
                          className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background flex items-center justify-between ${errors.sauda_ids ? 'border-red-500' : 'border-border'}`}
                        >
                          <span className="text-xs text-muted-foreground">
                            {getSelectedSaudas().length === 0 ? 'Select saudas...' : `${getSelectedSaudas().length} selected`}
                          </span>
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${saudaDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {saudaDropdownOpen && (
                          <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
                            <div className="p-1.5 border-b border-border">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                  type="text"
                                  value={saudaSearchQuery}
                                  onChange={(e) => setSaudaSearchQuery(e.target.value)}
                                  placeholder="Search..."
                                  className="w-full pl-7 pr-2 py-1 text-xs border border-border rounded-md bg-background"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <div className="max-h-40 overflow-y-auto p-1">
                              {saudas.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-1 px-2">No saudas</p>
                              ) : getFilteredSaudas().length === 0 ? (
                                <p className="text-xs text-muted-foreground py-1 px-2">No match</p>
                              ) : (
                                getFilteredSaudas().map((sauda) => {
                                  const isSelected = (formData.sauda_ids || []).includes(sauda.id);
                                  return (
                                    <button key={sauda.id} type="button" onClick={() => { toggleSaudaSelection(sauda.id); setSaudaSearchQuery(''); }}
                                      className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                                      <div className="flex items-center justify-between">
                                        <span>{getSaudaDisplayName(sauda)} - ₹{sauda.rate}</span>
                                        {isSelected && <Check className="h-3 w-3" />}
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Party Details */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Party Details</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-0.5">GST No.</label>
                        <input type="text" value={formData.party_gst_number || ''} onChange={(e) => setFormData({ ...formData, party_gst_number: e.target.value || null })}
                          className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background" placeholder="27ABCDE1234F1Z5" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-0.5">PAN No.</label>
                        <input type="text" value={formData.party_pan_number || ''} onChange={(e) => setFormData({ ...formData, party_pan_number: e.target.value || null })}
                          className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background" placeholder="ABCDE1234F" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-0.5">Party Name <span className="text-red-500">*</span></label>
                        <input type="text" value={formData.party_name} onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                          className={`w-full px-2 py-1.5 text-sm border rounded-md bg-background ${errors.party_name ? 'border-red-500' : 'border-border'}`} placeholder="Party Name" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-0.5">Address</label>
                        <input type="text" value={formData.party_address || ''} onChange={(e) => setFormData({ ...formData, party_address: e.target.value || null })}
                          className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background" placeholder="Party Address" />
                      </div>
                    </div>
                  </div>

                  {/* Slip & Date */}
                  <div className="grid grid-cols-2 gap-2">
                    {isEditMode && displaySlipNumber && (
                      <div>
                        <label className="block text-xs font-medium mb-0.5">Slip No.</label>
                        <input 
                          type="text" 
                          value={displaySlipNumber} 
                          readOnly
                          className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-muted/50 cursor-not-allowed" 
                        />
                      </div>
                    )}
                    <div className={isEditMode && displaySlipNumber ? '' : 'col-span-2'}>
                      <label className="block text-xs font-medium mb-0.5">Date <span className="text-red-500">*</span></label>
                      <div className="flex gap-1">
                        <button type="button" onClick={decrementDate} className="flex-shrink-0 p-1.5 border border-border rounded-md bg-background hover:bg-muted" title="Prev">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className={`flex-1 min-w-0 px-2 py-1.5 text-sm border rounded-md bg-background ${errors.date ? 'border-red-500' : 'border-border'}`} />
                        <button type="button" onClick={incrementDate} className="flex-shrink-0 p-1.5 border border-border rounded-md bg-background hover:bg-muted" title="Next">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Transporter & Vehicle */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transport & Vehicle</h3>
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Transporter</label>
                      <div className="flex gap-1">
                        <select value={formData.transporter_id || ''} onChange={(e) => {
                            if (e.target.value === '__add_new__') { window.open('/directory/transporters', '_blank'); return; }
                            setFormData({ ...formData, transporter_id: e.target.value || null });
                          }}
                          className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-border rounded-md bg-background">
                          <option value="">Select</option>
                          {transporters.filter(t => t.is_active).map((t) => (<option key={t.id} value={t.id}>{t.business_name}</option>))}
                          <option value="__add_new__">+ Add New</option>
                        </select>
                        <button type="button" onClick={() => refetchTransporters()} disabled={loadingTransporters} className="flex-shrink-0 p-1.5 border border-border rounded-md bg-background hover:bg-muted disabled:opacity-50">
                          <RefreshCw className={`h-3.5 w-3.5 ${loadingTransporters ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Vehicle Selection */}
                    <div>
                      <label className="block text-xs font-medium mb-0.5">Vehicle <span className="text-red-500">*</span></label>
                      {selectedVehicle ? (
                        <div className={`flex items-center gap-2 px-2 py-1.5 border rounded-md bg-emerald-50 border-emerald-200 ${errors.vehicle_id ? 'border-red-500' : ''}`}>
                          <Truck className="h-4 w-4 text-emerald-600" />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-sm">{selectedVehicle.vehicle_number}</span>
                            {selectedVehicle.owner_name && <span className="text-xs text-muted-foreground ml-2">({selectedVehicle.owner_name})</span>}
                            {selectedVehicle.is_verified && <Shield className="inline h-3 w-3 text-emerald-600 ml-1" title="Verified" />}
                          </div>
                          <button type="button" onClick={() => { setSelectedVehicle(null); setFormData(prev => ({ ...prev, vehicle_id: '' })); setVehicleNumberInput(''); }} className="p-1 hover:bg-emerald-100 rounded">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div ref={vehicleDropdownRef} className="space-y-1">
                          <div className="flex gap-1">
                            <input 
                              type="text" 
                              value={vehicleNumberInput} 
                              onChange={(e) => setVehicleNumberInput(e.target.value.toUpperCase())}
                              onFocus={() => setVehicleDropdownOpen(true)}
                              placeholder="Enter or select vehicle number"
                              className={`flex-1 px-2 py-1.5 text-sm border rounded-md bg-background uppercase ${errors.vehicle_id ? 'border-red-500' : 'border-border'}`}
                            />
                            <button 
                              type="button" 
                              onClick={handleVerifyVehicle} 
                              disabled={verifyingVehicle || !vehicleNumberInput.trim()} 
                              className="flex-shrink-0 px-2 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                              title="Verify via Surepass"
                            >
                              {verifyingVehicle ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                              Verify
                            </button>
                          </div>
                          
                          {/* Vehicle Dropdown */}
                          {vehicleDropdownOpen && vehicles.length > 0 && (
                            <div className="absolute z-20 w-full max-w-sm mt-1 bg-background border border-border rounded-md shadow-lg">
                              <div className="p-1.5 border-b border-border">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                  <input
                                    type="text"
                                    value={vehicleSearchQuery}
                                    onChange={(e) => setVehicleSearchQuery(e.target.value)}
                                    placeholder="Search vehicles..."
                                    className="w-full pl-7 pr-2 py-1 text-xs border border-border rounded-md bg-background"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <div className="max-h-32 overflow-y-auto p-1">
                                {getFilteredVehicles().length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-1 px-2">No vehicles found</p>
                                ) : (
                                  getFilteredVehicles().slice(0, 10).map((v) => (
                                    <button 
                                      key={v.id} 
                                      type="button" 
                                      onClick={() => { selectVehicle(v); setVehicleSearchQuery(''); }}
                                      className="w-full text-left px-2 py-1 rounded text-xs hover:bg-muted flex items-center justify-between"
                                    >
                                      <div>
                                        <span className="font-medium">{v.vehicle_number}</span>
                                        {v.owner_name && <span className="text-muted-foreground ml-1">- {v.owner_name}</span>}
                                      </div>
                                      {v.is_verified && <Shield className="h-3 w-3 text-emerald-500" />}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {/* Verification Result / Create Button */}
                          {vehicleNumberInput.trim() && !selectedVehicle && (
                            <div className="flex items-center gap-2">
                              {verificationResult ? (
                                <div className="flex-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                  <span className="text-emerald-600 font-medium">Verified:</span> {verificationResult.owner_name || 'N/A'} | {verificationResult.maker_model || 'N/A'}
                                </div>
                              ) : null}
                              <button 
                                type="button" 
                                onClick={handleCreateVehicle} 
                                disabled={verifyingVehicle} 
                                className="flex-shrink-0 px-2 py-1 text-xs border border-primary text-primary rounded-md hover:bg-primary/10 disabled:opacity-50 flex items-center gap-1"
                              >
                                {verifyingVehicle ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                Add Vehicle
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {errors.vehicle_id && <p className="text-xs text-red-500 mt-0.5">{errors.vehicle_id}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-0.5">Transport Cost (₹)</label>
                      <input type="number" step="0.01" value={formData.transportation_cost || ''} onChange={(e) => setFormData({ ...formData, transportation_cost: parseFloat(e.target.value) || null })}
                        className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background" placeholder="0" />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium">Notes</label>
                    <input type="text" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                      className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background" placeholder="Additional notes" />
                  </div>

                  {/* Documents */}
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase">Documents</h3>
                      {!isEditMode && <span className="text-[10px] text-muted-foreground">Upload after save</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(['bill_image', 'transportation_bill', 'purchase_bill', 'bilti', 'eway_bill'] as const).map((field) => (
                        <div key={field} className="relative">
                          <label className="block text-[10px] font-medium mb-0.5 capitalize">{field.replace(/_/g, ' ')}</label>
                          <div className="relative">
                            <input type="file" accept="image/*,.pdf" onChange={(e) => { handleFileSelect(field, e.target.files?.[0] || null); }} disabled={uploading[field]}
                              className="w-full px-1.5 py-1 text-[10px] border border-border rounded-md bg-background file:mr-1 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[10px] file:bg-primary/10 file:text-primary disabled:opacity-50" />
                            {uploading[field] && <div className="absolute right-1.5 top-1/2 -translate-y-1/2"><Loader2 className="h-3 w-3 animate-spin text-primary" /></div>}
                            {uploadSuccess[field] && !uploading[field] && <div className="absolute right-1.5 top-1/2 -translate-y-1/2"><Check className="h-3 w-3 text-emerald-500" /></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-border">
                    <button type="button" onClick={() => onOpenChange(false)} className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors">Cancel</button>
                    <button type="submit" disabled={loading} className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50">
                      {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>

                {/* Preview Section - Weighbridge Slip Style */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      ISP Preview
                    </h3>
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </button>
                  </div>

                  <div 
                    ref={previewRef}
                    className="border-2 border-border rounded-lg p-4 bg-background font-mono text-xs overflow-y-auto max-h-[65vh]"
                  >
                      {/* Thanks Message */}
                      <div className="text-center mb-4 text-[10px] text-muted-foreground">
                        ! Thanks for your visit !
                      </div>

                      {/* Company Header */}
                      <div className="text-center border-b-2 border-dashed border-border pb-3 mb-4">
                        <h2 className="font-bold text-lg tracking-wider">{defaultRecipient?.name || 'Loading...'}</h2>
                        <p className="text-[9px] text-muted-foreground mt-1">{defaultRecipient?.address || '-'}</p>
                        <p className="text-[9px] text-muted-foreground">LLPIN: {defaultRecipient?.llpin || '-'}</p>
                      </div>

                      {/* Slip Info Row */}
                      <div className="border-b border-dotted border-border pb-2 mb-3">
                        <div className="flex justify-between gap-4 flex-wrap">
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">RST No.:</span>
                            <span className="font-bold">{isEditMode ? displaySlipNumber : (formData.slip_number || 'Auto-generated')}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Vehicle No.:</span>
                            <span className="font-bold">{selectedVehicle?.vehicle_number || vehicleNumberInput || '-'}</span>
                          </div>
                        </div>
                        <div className="flex justify-between gap-4 mt-2 flex-wrap">
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Party Name:</span>
                            <span className="font-bold">{formData.party_name || '-'}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-muted-foreground">Item:</span>
                            <span className="font-bold">RICE</span>
                          </div>
                        </div>
                      </div>

                      {/* Address Row */}
                      {formData.party_address && (
                        <div className="border-b border-dotted border-border pb-2 mb-3">
                          <span className="text-muted-foreground">Address:</span>
                          <span className="font-semibold ml-2">{formData.party_address}</span>
                        </div>
                      )}

                      {/* Date */}
                      <div className="flex justify-between border-b border-dotted border-border pb-2 mb-3">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-bold">{formData.date || '-'}</span>
                      </div>

                      {/* Charges */}
                      {formData.transportation_cost && (
                        <div className="border-t-2 border-dashed border-border pt-3 mt-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Transportation Cost:</span>
                            <span className="font-bold">₹ {formData.transportation_cost?.toLocaleString('en-IN') || '-'}</span>
                          </div>
                        </div>
                      )}

                      {/* Transporter Info */}
                      {formData.transporter_id && (
                        <div className="border-t border-dotted border-border pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Transporter:</span>
                            <span className="font-semibold">{getTransporterName(formData.transporter_id)}</span>
                          </div>
                        </div>
                      )}

                      {/* Linked Saudas */}
                      {getSelectedSaudas().length > 0 && (
                        <div className="border-t-2 border-dashed border-border pt-3 mt-3">
                          <div className="font-bold mb-2">Linked Saudas ({getSelectedSaudas().length})</div>
                          <div className="space-y-1 bg-muted/30 p-2 rounded">
                            {getSelectedSaudas().map((sauda, idx) => (
                              <div key={sauda.id} className="flex justify-between items-center py-1 border-b border-dotted border-border last:border-0">
                                <span className="text-muted-foreground">{idx + 1}.</span>
                                <span className="flex-1 ml-2">{getSaudaDisplayName(sauda)}</span>
                                <span className="font-semibold">₹{sauda.rate}/kg</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {formData.notes && (
                        <div className="border-t border-dotted border-border pt-2 mt-3">
                          <span className="text-muted-foreground">Notes:</span>
                          <p className="mt-1">{formData.notes}</p>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="text-center border-t-2 border-dashed border-border pt-3 mt-4">
                        <p className="text-[9px] text-muted-foreground">Generated on {new Date().toLocaleString('en-IN')}</p>
                        <p className="text-[9px] text-muted-foreground">This is a computer-generated document</p>
                      </div>
                    </div>
                  </div>
                </div>
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

