import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect, useRef } from 'react';
import { X, Car, Shield, Loader2, Check, RefreshCw, Plus, ChevronDown, Search } from 'lucide-react';
import { vehiclesAPI } from '../../../services/vehicles.api';
import { useTransporters } from '../../../hooks/useTransporters';
import { AlertDialog } from '../../shared/AlertDialog';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import type { CreateVehicleRequest, Vehicle, VehicleVerificationResponse } from '../../../types/entities';

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
  const [verifying, setVerifying] = useState(false);
  const [verifiedFields, setVerifiedFields] = useState<Set<string>>(new Set());
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
        vehicle_number: vehicle.vehicle_number,
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
      // If vehicle was verified, mark those fields as read-only
      if (vehicle.is_verified) {
        const verifiedFieldsSet = new Set<string>();
        if (vehicle.owner_name) verifiedFieldsSet.add('owner_name');
        if (vehicle.maker_model) verifiedFieldsSet.add('maker_model');
        if (vehicle.vehicle_class) verifiedFieldsSet.add('vehicle_class');
        if (vehicle.fuel_type) verifiedFieldsSet.add('fuel_type');
        if (vehicle.rc_number) verifiedFieldsSet.add('rc_number');
        if (vehicle.registration_date) verifiedFieldsSet.add('registration_date');
        if (vehicle.insurance_validity) verifiedFieldsSet.add('insurance_validity');
        if (vehicle.fitness_validity) verifiedFieldsSet.add('fitness_validity');
        if (vehicle.permit_validity) verifiedFieldsSet.add('permit_validity');
        setVerifiedFields(verifiedFieldsSet);
      }
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
    setVerifiedFields(new Set());
  };

  const handleVerify = async () => {
    if (!formData.vehicle_number.trim()) {
      setErrors({ vehicle_number: 'Enter vehicle number first' });
      return;
    }

    setVerifying(true);
    try {
      const result = await vehiclesAPI.verifyVehicle(formData.vehicle_number.trim());
      const verifiedFieldsSet = new Set<string>();
      
      // Track which fields were verified
      if (result.owner_name) verifiedFieldsSet.add('owner_name');
      if (result.maker_model) verifiedFieldsSet.add('maker_model');
      if (result.vehicle_class) verifiedFieldsSet.add('vehicle_class');
      if (result.fuel_type) verifiedFieldsSet.add('fuel_type');
      if (result.rc_number) verifiedFieldsSet.add('rc_number');
      if (result.registration_date) verifiedFieldsSet.add('registration_date');
      if (result.insurance_validity) verifiedFieldsSet.add('insurance_validity');
      if (result.fitness_validity) verifiedFieldsSet.add('fitness_validity');
      if (result.permit_validity) verifiedFieldsSet.add('permit_validity');
      
      setFormData(prev => ({
        ...prev,
        ...result,
        vehicle_number: result.vehicle_number || prev.vehicle_number,
        is_verified: true,
        verified_at: new Date().toISOString(),
      }));
      setVerifiedFields(verifiedFieldsSet);
      setAlertType('success');
      setAlertTitle('Vehicle Verified');
      setAlertMessage(`Owner: ${result.owner_name || 'N/A'}, Model: ${result.maker_model || 'N/A'}`);
      setAlertOpen(true);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Verification Failed');
      setAlertMessage(error.message || 'Could not verify vehicle. You can still add it manually.');
      setAlertOpen(true);
      // Don't set verified fields on error - allow manual entry
    } finally {
      setVerifying(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.vehicle_number.trim()) {
      newErrors.vehicle_number = 'Vehicle number is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isEditMode && vehicleId) {
        await vehiclesAPI.updateVehicle(vehicleId, formData);
        setAlertType('success');
        setAlertTitle('Success');
        setAlertMessage('Vehicle updated successfully');
      } else {
        await vehiclesAPI.createVehicle({
          ...formData,
          vehicle_number: formData.vehicle_number.toUpperCase(),
        });
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
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error.message || 'Failed to save vehicle');
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
                  {/* Vehicle Number + Verify */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Vehicle Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.vehicle_number}
                        onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value.toUpperCase() })}
                        disabled={isEditMode}
                        className={`flex-1 px-3 py-2 border rounded-lg bg-background uppercase ${errors.vehicle_number ? 'border-red-500' : 'border-border'} ${isEditMode ? 'opacity-60' : ''}`}
                        placeholder="MH01AB1234"
                      />
                      {!isEditMode && (
                        <button
                          type="button"
                          onClick={handleVerify}
                          disabled={verifying || !formData.vehicle_number.trim()}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                        >
                          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                          Verify
                        </button>
                      )}
                    </div>
                    {errors.vehicle_number && <p className="text-xs text-red-500 mt-1">{errors.vehicle_number}</p>}
                    {formData.is_verified && (
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Verified via Surepass
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
                        onChange={(e) => setFormData({ ...formData, owner_name: e.target.value || null })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background read-only:cursor-not-allowed"
                        placeholder="Owner name"
                        readOnly={verifiedFields.has('owner_name')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Maker / Model</label>
                      <input
                        type="text"
                        value={formData.maker_model || ''}
                        onChange={(e) => setFormData({ ...formData, maker_model: e.target.value || null })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background read-only:cursor-not-allowed"
                        placeholder="TATA ACE"
                        readOnly={verifiedFields.has('maker_model')}
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
                        onChange={(e) => setFormData({ ...formData, vehicle_class: e.target.value || null })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background read-only:cursor-not-allowed"
                        placeholder="LMV, HMV"
                        readOnly={verifiedFields.has('vehicle_class')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fuel Type</label>
                      <select
                        value={formData.fuel_type || ''}
                        onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value || null })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                        disabled={verifiedFields.has('fuel_type')}
                      >
                        <option value="">Select</option>
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
                        onChange={(e) => setFormData({ ...formData, registration_date: e.target.value || null })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm read-only:cursor-not-allowed"
                        readOnly={verifiedFields.has('registration_date')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Insurance Valid</label>
                      <input
                        type="date"
                        value={formData.insurance_validity || ''}
                        onChange={(e) => setFormData({ ...formData, insurance_validity: e.target.value || null })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm read-only:cursor-not-allowed"
                        readOnly={verifiedFields.has('insurance_validity')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fitness Valid</label>
                      <input
                        type="date"
                        value={formData.fitness_validity || ''}
                        onChange={(e) => setFormData({ ...formData, fitness_validity: e.target.value || null })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm read-only:cursor-not-allowed"
                        readOnly={verifiedFields.has('fitness_validity')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Permit Valid</label>
                      <input
                        type="date"
                        value={formData.permit_validity || ''}
                        onChange={(e) => setFormData({ ...formData, permit_validity: e.target.value || null })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm read-only:cursor-not-allowed"
                        readOnly={verifiedFields.has('permit_validity')}
                      />
                    </div>
                  </div>

                  {/* Transporters */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">Linked Transporters</label>
                      <button
                        type="button"
                        onClick={() => refetchTransporters()}
                        disabled={loadingTransporters}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${loadingTransporters ? 'animate-spin' : ''}`} />
                      </button>
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

                  {/* Active Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 rounded border-border"
                    />
                    <label htmlFor="is_active" className="text-sm">Active</label>
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


