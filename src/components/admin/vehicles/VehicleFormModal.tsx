import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useRef } from 'react';
import { X, Car, Loader2, Check, RefreshCw, Plus, ChevronDown, Search, ExternalLink } from 'lucide-react';
import { vehiclesAPI } from '../../../services/vehicles.api';
import { useTransporters } from '../../../hooks/useTransporters';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { CreateVehicleRequest, VehicleVerificationDetails } from '../../../types/entities';
import {
  buildVehicleSavePayload,
  persistRcFullSnapshot,
  vehiclePersist,
} from '../../../utils/kycVerification';
import { mapRcFullToVehicleForm } from '../../../utils/rcFullMapping';
import { getUserFacingApiErrorMessage } from '../../../utils/errorHandler';
import { getDirectoryTransportersPagePath } from '../../../utils/appRoutes';
import { kycAPI } from '../../../services/kyc.api';
import { mapRcOcrToVehicleForm } from '../../../utils/documentOcrFields';
import { DOCUMENT_OCR_FILE_HINT } from '../../../utils/documentOcr';
import { DocumentOcrUpload } from '../../shared/DocumentOcrUpload';
import {
  getVehicleNumberValidationError,
  sanitizeVehicleNumberInput,
  VEHICLE_NUMBER_FORMATS,
  VEHICLE_NUMBER_MAX_LENGTH,
} from '../../../utils/validation';

interface VehicleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId?: string | null;
}

export function VehicleFormModal({ open, onOpenChange, vehicleId }: VehicleFormModalProps) {
  const { transporters, refetch: refetchTransporters, loading: loadingTransporters } = useTransporters();
  const isEditMode = !!vehicleId;

  const [formData, setFormData] = useState<CreateVehicleRequest>({
    vehicle_number: '',
    rc_number: null,
    owner_name: null,
    vehicle_class: null,
    fuel_type: null,
    maker_model: null,
    registration_date: null,
    insurance_validity: null,
    fitness_validity: null,
    permit_validity: null,
    challan_details: null,
    transporter_ids: [],
    is_verified: false,
    verified_at: null,
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  const [fetchingRc, setFetchingRc] = useState(false);
  const [scanningRcOcr, setScanningRcOcr] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<VehicleVerificationDetails>({});
  const vehiclePersistContext = vehiclePersist(vehicleId);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (open && vehicleId && isEditMode) {
      loadVehicleData();
    } else if (open && !vehicleId) {
      resetForm();
    }
  }, [open, vehicleId]);

  const loadVehicleData = async () => {
    if (!vehicleId) return;
    setLoadingVehicle(true);
    try {
      const vehicle = await vehiclesAPI.getVehicleById(vehicleId);
      setFormData({
        vehicle_number: sanitizeVehicleNumberInput(vehicle.vehicle_number),
        rc_number: vehicle.rc_number,
        owner_name: vehicle.owner_name,
        vehicle_class: vehicle.vehicle_class,
        fuel_type: vehicle.fuel_type,
        maker_model: vehicle.maker_model,
        registration_date: vehicle.registration_date,
        insurance_validity: vehicle.insurance_validity,
        fitness_validity: vehicle.fitness_validity,
        permit_validity: vehicle.permit_validity,
        challan_details: vehicle.challan_details,
        transporter_ids: vehicle.transporter_ids || [],
        is_verified: vehicle.is_verified,
        verified_at: vehicle.verified_at,
        is_active: vehicle.is_active,
      });
      setVerificationDetails(vehicle.verification_details ?? {});
      setErrors({});
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to load vehicle');
      setAlertOpen(true);
    } finally {
      setLoadingVehicle(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_number: '',
      rc_number: null,
      owner_name: null,
      vehicle_class: null,
      fuel_type: null,
      maker_model: null,
      registration_date: null,
      insurance_validity: null,
      fitness_validity: null,
      permit_validity: null,
      challan_details: null,
      transporter_ids: [],
      is_verified: false,
      verified_at: null,
      is_active: true,
    });
    setErrors({});
    setVerificationDetails({});
  };

  const clearRcFetchedFields = (): Partial<CreateVehicleRequest> => ({
    rc_number: null,
    owner_name: null,
    vehicle_class: null,
    fuel_type: null,
    maker_model: null,
    registration_date: null,
    insurance_validity: null,
    fitness_validity: null,
    permit_validity: null,
    challan_details: null,
    is_verified: false,
    verified_at: null,
  });

  const handleVehicleNumberChange = (value: string) => {
    const nextNumber = sanitizeVehicleNumberInput(value);
    const numberChanged = formData.vehicle_number.trim() !== nextNumber.trim();

    setFormData((prev) => ({
      ...prev,
      vehicle_number: nextNumber,
      ...(numberChanged ? clearRcFetchedFields() : {}),
    }));

    if (numberChanged) {
      setVerificationDetails({});
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.vehicle_number;
      delete next.rc_fetch;
      return next;
    });
  };

  const handleFetchRcFull = async () => {
    const idNumber = sanitizeVehicleNumberInput(formData.vehicle_number);
    if (!idNumber) {
      setErrors((prev) => ({ ...prev, vehicle_number: 'Enter vehicle number first' }));
      return;
    }
    const formatError = getVehicleNumberValidationError(idNumber);
    if (formatError) {
      setErrors((prev) => ({ ...prev, vehicle_number: formatError }));
      return;
    }

    setFetchingRc(true);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.rc_fetch;
      delete next.vehicle_number;
      return next;
    });

    try {
      const result = await vehiclesAPI.lookupRcFull(idNumber, vehiclePersistContext);
      const mapped = mapRcFullToVehicleForm(result);
      if (!mapped) {
        throw new Error('Could not parse RC full response');
      }

      setFormData((prev) => ({
        ...prev,
        ...mapped.form,
        vehicle_number: mapped.form.vehicle_number || prev.vehicle_number,
        transporter_ids: prev.transporter_ids,
      }));
      setVerificationDetails((prev) => persistRcFullSnapshot(prev, result));

      if (mapped.form.is_verified) {
        setAlertType('success');
        setAlertTitle('RC details fetched');
        setAlertMessage(
          `Owner: ${mapped.form.owner_name || 'N/A'}, Model: ${mapped.form.maker_model || 'N/A'}`,
        );
      } else {
        setAlertType('warning');
        setAlertTitle('RC lookup returned NA data');
        setAlertMessage(
          'Surepass returned NA or empty fields for this vehicle. It remains unverified until usable RC data is available.',
        );
      }
      setAlertOpen(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'RC lookup failed';
      setErrors((prev) => ({ ...prev, rc_fetch: message }));
    } finally {
      setFetchingRc(false);
    }
  };

  const handleRcOcrScan = async (file: File) => {
    setScanningRcOcr(true);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.rc_fetch;
      delete next.vehicle_number;
      return next;
    });

    try {
      const result = await kycAPI.ocrRc(file);
      const mapped = mapRcOcrToVehicleForm(result);
      if (!mapped?.vehicle_number) {
        throw new Error('Could not extract registration number from RC');
      }

      setFormData((prev) => ({
        ...prev,
        ...mapped,
        transporter_ids: prev.transporter_ids,
        is_active: prev.is_active,
      }));

      setAlertType('success');
      setAlertTitle('RC scanned');
      setAlertMessage(
        `${mapped.vehicle_number}${mapped.owner_name ? ` · ${mapped.owner_name}` : ''} — review prefilled fields, then Fetch RC for full validation.`,
      );
      setAlertOpen(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'RC scan failed';
      setErrors((prev) => ({ ...prev, rc_fetch: message }));
      setAlertType('error');
      setAlertTitle('Scan failed');
      setAlertMessage(message);
      setAlertOpen(true);
    } finally {
      setScanningRcOcr(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const vehicleNumberError = getVehicleNumberValidationError(formData.vehicle_number);
    if (vehicleNumberError) {
      newErrors.vehicle_number = vehicleNumberError;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasRcLookupSnapshot = Boolean(verificationDetails.rc_full);
  const hasRcFetchedData = Boolean(formData.is_verified);
  const rcFieldClassName =
    'w-full px-3 py-2 border border-border rounded-lg bg-muted/40 text-sm read-only:cursor-not-allowed opacity-80';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const basePayload: CreateVehicleRequest = {
        ...formData,
        vehicle_number: sanitizeVehicleNumberInput(formData.vehicle_number),
      };
      const payload = buildVehicleSavePayload(basePayload, verificationDetails);

      if (isEditMode && vehicleId) {
        await vehiclesAPI.updateVehicle(vehicleId, payload);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Vehicle updated successfully');
      } else {
        await vehiclesAPI.createVehicle(payload);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Vehicle created successfully');
      }
      setAlertOpen(true);
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (error: any) {
      const errorMessage = getUserFacingApiErrorMessage(
        error,
        isEditMode ? 'Failed to update vehicle' : 'Failed to create vehicle',
      );

      if (/vehicle number already exists/i.test(errorMessage)) {
        setErrors({ vehicle_number: errorMessage });
      }

      setAlertType('error');
      setAlertTitle(isEditMode ? 'Cannot Update Vehicle' : 'Cannot Create Vehicle');
      setAlertMessage(errorMessage);
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleTransporter = (transporterId: string) => {
    setFormData(prev => ({
      ...prev,
      transporter_ids: prev.transporter_ids?.includes(transporterId)
        ? prev.transporter_ids.filter(id => id !== transporterId)
        : [...(prev.transporter_ids || []), transporterId],
    }));
  };

  const [transporterDropdownOpen, setTransporterDropdownOpen] = useState(false);
  const transporterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (transporterDropdownRef.current && !transporterDropdownRef.current.contains(event.target as Node)) {
        setTransporterDropdownOpen(false);
      }
    };
    if (transporterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [transporterDropdownOpen]);

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Car className="h-5 w-5 text-primary" />
                  </div>
                  <Dialog.Title className="text-xl font-semibold">
                    {isEditMode ? 'Edit Vehicle' : 'Add Vehicle'}
                  </Dialog.Title>
                </div>
                <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingVehicle ? (
                <div className="flex justify-center py-10"><LoadingSpinner /></div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!formData.is_verified && (
                    <DocumentOcrUpload
                      title="Scan vehicle RC (OCR)"
                      hint={`Upload the RC document image or PDF. Prefills registration details — use Fetch RC for full validation. ${DOCUMENT_OCR_FILE_HINT}.`}
                      scanning={scanningRcOcr}
                      disabled={fetchingRc || loading}
                      onScan={(file) => void handleRcOcrScan(file)}
                    />
                  )}

                  {/* Vehicle Number */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Vehicle Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.vehicle_number}
                        onChange={(e) => handleVehicleNumberChange(e.target.value)}
                        maxLength={VEHICLE_NUMBER_MAX_LENGTH}
                        className={`flex-1 px-3 py-2 border rounded-lg bg-background uppercase ${errors.vehicle_number ? 'border-red-500' : 'border-border'}`}
                        placeholder="MH01AB1234"
                      />
                      <button
                        type="button"
                        onClick={() => void handleFetchRcFull()}
                        disabled={fetchingRc || !formData.vehicle_number.trim()}
                        className="px-4 py-2 btn-secondary flex items-center gap-2 shrink-0 disabled:opacity-50"
                      >
                        {fetchingRc ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                        Fetch RC
                      </button>
                    </div>
                    {errors.vehicle_number && <p className="text-xs text-red-500 mt-1">{errors.vehicle_number}</p>}
                    {!errors.vehicle_number && (
                      <details className="mt-1 text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground">Accepted formats</summary>
                        <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                          {VEHICLE_NUMBER_FORMATS.map((format) => (
                            <li key={format.id}>
                              <span className="font-mono">{format.example}</span>
                              <span className="text-muted-foreground/80"> — {format.label}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {errors.rc_fetch && <p className="text-xs text-red-500 mt-1">{errors.rc_fetch}</p>}
                    {formData.is_verified && (
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Verified via Surepass
                      </p>
                    )}
                    {!hasRcFetchedData && !hasRcLookupSnapshot && (
                      <p className="text-xs text-amber-600 mt-1">
                        Unverified — only the vehicle number is required to save. Click Fetch RC to load registration details from Surepass.
                      </p>
                    )}
                    {!hasRcFetchedData && hasRcLookupSnapshot && (
                      <p className="text-xs text-amber-600 mt-1">
                        RC lookup returned NA or insufficient data — this vehicle remains unverified.
                      </p>
                    )}
                    {hasRcFetchedData && (
                      <p className="text-xs text-muted-foreground mt-1">
                        RC details below are read-only. You can change the vehicle number; click Fetch RC again to refresh details.
                      </p>
                    )}
                  </div>

                  {/* Owner & Model */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Owner Name</label>
                      <input
                        type="text"
                        value={formData.owner_name || ''}
                        readOnly
                        tabIndex={-1}
                        className={rcFieldClassName}
                        placeholder="Fetched from RC"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Maker / Model</label>
                      <input
                        type="text"
                        value={formData.maker_model || ''}
                        readOnly
                        tabIndex={-1}
                        className={rcFieldClassName}
                        placeholder="Fetched from RC"
                      />
                    </div>
                  </div>

                  {/* Class & Fuel */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Vehicle Class</label>
                      <input
                        type="text"
                        value={formData.vehicle_class || ''}
                        readOnly
                        tabIndex={-1}
                        className={rcFieldClassName}
                        placeholder="Fetched from RC"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fuel Type</label>
                      <select
                        value={formData.fuel_type || ''}
                        disabled
                        className={`${rcFieldClassName} disabled:cursor-not-allowed`}
                      >
                        <option value="">Not fetched</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Petrol">Petrol</option>
                        <option value="CNG">CNG</option>
                        <option value="Electric">Electric</option>
                      </select>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Registration</label>
                      <input
                        type="date"
                        value={formData.registration_date || ''}
                        readOnly
                        tabIndex={-1}
                        className={rcFieldClassName}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Insurance Valid</label>
                      <input
                        type="date"
                        value={formData.insurance_validity || ''}
                        readOnly
                        tabIndex={-1}
                        className={rcFieldClassName}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fitness Valid</label>
                      <input
                        type="date"
                        value={formData.fitness_validity || ''}
                        readOnly
                        tabIndex={-1}
                        className={rcFieldClassName}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Permit Valid</label>
                      <input
                        type="date"
                        value={formData.permit_validity || ''}
                        readOnly
                        tabIndex={-1}
                        className={rcFieldClassName}
                      />
                    </div>
                  </div>

                  {/* Transporters */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="block text-sm font-medium">Linked Transporters</label>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            window.open(getDirectoryTransportersPagePath({ create: true }), '_blank', 'noopener,noreferrer')
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          Add Transporter
                        </button>
                        <button
                          type="button"
                          onClick={() => refetchTransporters()}
                          disabled={loadingTransporters}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${loadingTransporters ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div ref={transporterDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setTransporterDropdownOpen(!transporterDropdownOpen)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {formData.transporter_ids && formData.transporter_ids.length > 0
                            ? `${formData.transporter_ids.length} selected`
                            : 'Select transporters...'}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${transporterDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {transporterDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {transporters.filter(t => t.is_active).map((t) => {
                            const isSelected = formData.transporter_ids?.includes(t.id);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => toggleTransporter(t.id)}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                                  isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                                }`}
                              >
                                <span>{t.business_name}</span>
                                {isSelected && <Check className="h-4 w-4" />}
                              </button>
                            );
                          })}
                          {transporters.filter(t => t.is_active).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No transporters available</div>
                          )}
                        </div>
                      )}
                    </div>
                    {formData.transporter_ids && formData.transporter_ids.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.transporter_ids.map((id) => {
                          const transporter = transporters.find(t => t.id === id);
                          if (!transporter) return null;
                          return (
                            <div
                              key={id}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                            >
                              <span>{transporter.business_name}</span>
                              <button
                                type="button"
                                onClick={() => toggleTransporter(id)}
                                className="hover:bg-primary/20 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
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
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
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


