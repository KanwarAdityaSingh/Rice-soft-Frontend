import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useInwardSlipPasses } from '../../hooks/useInwardSlipPasses';
import { useVendors } from '../../hooks/useVendors';
import { saudasAPI } from '../../services/saudas.api';
import { transportersAPI } from '../../services/transporters.api';
import { inwardSlipPassesAPI } from '../../services/inwardSlipPasses.api';
import { LotTable } from './LotTable';
import { DocumentUpload } from './DocumentUpload';
import { AlertDialog } from '../shared/AlertDialog';
import { LoadingSpinner } from '../admin/shared/LoadingSpinner';
import { CustomSelect } from '../shared/CustomSelect';
import type { CreateInwardSlipPassRequest, CreateInwardSlipLotRequest } from '../../types/entities';

interface InwardSlipFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saudaId: string;
  inwardSlipId?: string;
  onSuccess?: (inwardSlipId?: string) => void;
}

export function InwardSlipFormModal({ open, onOpenChange, saudaId, inwardSlipId, onSuccess }: InwardSlipFormModalProps) {
  const { createInwardSlipPass, updateInwardSlipPass } = useInwardSlipPasses();
  const { vendors } = useVendors();
  const isEditMode = !!inwardSlipId;
  const [formData, setFormData] = useState<Omit<CreateInwardSlipPassRequest, 'lots'>>({
    sauda_id: saudaId,
    slip_number: '',
    date: new Date().toISOString().split('T')[0],
    vehicle_number: '',
    party_name: '',
    party_address: '',
    party_gst_number: null,
    status: 'pending',
  });

  const [lots, setLots] = useState<(CreateInwardSlipLotRequest & { id?: string })[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lotErrors, setLotErrors] = useState<Record<number, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [vehicleNumbers, setVehicleNumbers] = useState<string[]>([]);
  const [loadingTransporter, setLoadingTransporter] = useState(false);
  const [saudaRate, setSaudaRate] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingBill, setPendingBill] = useState<File | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (open) {
      if (isEditMode && inwardSlipId) {
        loadInwardSlipData();
      } else {
        // Check if inward slip already exists for this sauda
        inwardSlipPassesAPI.getAllInwardSlipPasses(saudaId)
          .then((slips) => {
            if (slips.length > 0) {
              setAlertType('warning');
              setAlertTitle('Inward Slip Already Exists');
              setAlertMessage('An inward slip already exists for this sauda. Only one inward slip is allowed per sauda.');
              setAlertOpen(true);
              onOpenChange(false);
      } else {
      setFormData({
        sauda_id: saudaId,
        slip_number: '',
        date: new Date().toISOString().split('T')[0],
        vehicle_number: '',
        party_name: '',
        party_address: '',
        party_gst_number: null,
        status: 'pending',
      });
      setLots([]);
      setErrors({});
      setLotErrors({});
      setPendingBill(null);
      }
          })
          .catch((error) => {
            console.error('Error checking for existing inward slip:', error);
            // Continue with form setup even if check fails
            setFormData({
              sauda_id: saudaId,
              slip_number: '',
              date: new Date().toISOString().split('T')[0],
              vehicle_number: '',
              party_name: '',
              party_address: '',
              party_gst_number: null,
              status: 'pending',
            });
            setLots([]);
            setErrors({});
            setLotErrors({});
            setPendingBill(null);
          });
      }
    }
  }, [open, saudaId, isEditMode, inwardSlipId, onOpenChange]);

  const loadInwardSlipData = async () => {
    if (!inwardSlipId) return;
    setLoadingData(true);
    try {
      const data = await inwardSlipPassesAPI.getInwardSlipPassById(inwardSlipId);
      setFormData({
        sauda_id: data.sauda_id,
        slip_number: data.slip_number,
        date: data.date,
        vehicle_number: data.vehicle_number,
        party_name: data.party_name,
        party_address: data.party_address,
        party_gst_number: data.party_gst_number,
        status: data.status,
        inward_slip_bill_image_url: data.inward_slip_bill_image_url || null,
      });
      setLots(
        data.lots.map((lot) => ({
          id: lot.id, // Preserve lot ID for updates
          lot_number: lot.lot_number,
          item_name: lot.item_name,
          no_of_bags: lot.no_of_bags,
          bag_weight: lot.bag_weight,
          bill_weight: lot.bill_weight,
          received_weight: lot.received_weight,
          bardana: lot.bardana,
          rate: lot.rate,
        }))
      );
    } catch (error: any) {
      console.error('Failed to load inward slip pass:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (open && saudaId && !isEditMode) {
      // Load sauda details to pre-fill some fields
      setLoadingTransporter(true);
      saudasAPI
        .getSaudaById(saudaId)
        .then((sauda) => {
          // Store sauda rate for auto-filling lots
          setSaudaRate(sauda.rate);

          // Load vendor details if purchaser_id exists
          let partyName = '';
          let partyAddress = '';
          if (sauda.purchaser_id) {
            const vendor = vendors.find(v => v.id === sauda.purchaser_id);
            if (vendor) {
              partyName = vendor.business_name;
              partyAddress = vendor.address 
                ? `${vendor.address.street}, ${vendor.address.city}, ${vendor.address.state} - ${vendor.address.pincode}`
                : '';
            }
          }

          setFormData((prev) => ({
            ...prev,
            party_name: partyName || prev.party_name,
            party_address: partyAddress || prev.party_address,
          }));

          // If sauda has a transporter, load transporter details to get vehicle numbers
          if (sauda.transporter_id) {
            transportersAPI
              .getTransporterById(sauda.transporter_id)
              .then((transporter) => {
                const vehicles = transporter.vehicle_numbers || [];
                setVehicleNumbers(vehicles);

                // Auto-fill vehicle number if there's only one
                if (vehicles.length === 1) {
                  setFormData((prev) => ({
                    ...prev,
                    vehicle_number: vehicles[0],
                  }));
                }
              })
              .catch((error) => {
                console.error('Failed to load transporter:', error);
              })
              .finally(() => {
                setLoadingTransporter(false);
              });
          } else {
            setLoadingTransporter(false);
          }
        })
        .catch((error) => {
          console.error('Failed to load sauda:', error);
          setLoadingTransporter(false);
        });
    } else {
      setVehicleNumbers([]);
      setLoadingTransporter(false);
    }
  }, [open, saudaId, isEditMode]);

  // Auto-fill rate in existing lots when saudaRate is loaded
  useEffect(() => {
    if (saudaRate && saudaRate > 0 && lots.length > 0 && !isEditMode) {
      setLots((prevLots) =>
        prevLots.map((lot) => ({
          ...lot,
          rate: lot.rate > 0 ? lot.rate : saudaRate,
        }))
      );
    }
  }, [saudaRate, isEditMode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.slip_number) newErrors.slip_number = 'Slip number required';
    if (!formData.date) newErrors.date = 'Date required';
    if (!formData.vehicle_number) newErrors.vehicle_number = 'Vehicle number required';
    if (!formData.party_name) newErrors.party_name = 'Vendor name required';
    if (!formData.party_address) newErrors.party_address = 'Vendor address required';
    if (lots.length === 0) newErrors.lots = 'At least one lot is required';

    const newLotErrors: Record<number, Record<string, string>> = {};
    lots.forEach((lot, index) => {
      const lotError: Record<string, string> = {};
      if (!lot.lot_number) lotError.lot_number = 'Required';
      if (!lot.item_name) lotError.item_name = 'Required';
      if (!lot.no_of_bags || lot.no_of_bags <= 0) lotError.no_of_bags = 'Required';
      if (!lot.bag_weight || lot.bag_weight <= 0) lotError.bag_weight = 'Required';
      if (!lot.bill_weight || lot.bill_weight <= 0) lotError.bill_weight = 'Required';
      if (!lot.received_weight || lot.received_weight <= 0) lotError.received_weight = 'Required';
      if (!lot.bardana) lotError.bardana = 'Required';
      if (!lot.rate || lot.rate <= 0) lotError.rate = 'Required';
      if (Object.keys(lotError).length > 0) {
        newLotErrors[index] = lotError;
      }
    });

    setErrors(newErrors);
    setLotErrors(newLotErrors);
    return Object.keys(newErrors).length === 0 && Object.keys(newLotErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isEditMode && inwardSlipId) {
        // Update the inward slip pass (without lots)
        await updateInwardSlipPass(inwardSlipId, formData);
        
        // Update existing lots individually
        const existingLots = lots.filter((lot) => lot.id);
        const newLots = lots.filter((lot) => !lot.id);
        
        // Update existing lots using the update lot API
        await Promise.all(
          existingLots.map((lot) => {
            const { id, ...lotData } = lot;
            return inwardSlipPassesAPI.updateLot(inwardSlipId, id!, lotData);
          })
        );
        
        // If there are new lots, add them via the update request
        if (newLots.length > 0) {
          await updateInwardSlipPass(inwardSlipId, { lots: newLots });
        }
        
        // Upload bill if pending
        if (pendingBill) {
          await inwardSlipPassesAPI.uploadInwardSlipBill(inwardSlipId, pendingBill);
        }
        
        setAlertType('success');
        setAlertTitle('Inward Slip Pass Updated');
        setAlertMessage('Inward slip pass has been updated successfully.');
      } else {
        const newInwardSlip = await createInwardSlipPass({ ...formData, lots: lots.map(({ id, ...lot }) => lot) });
        
        // Upload bill if pending
        if (pendingBill && newInwardSlip.id) {
          await inwardSlipPassesAPI.uploadInwardSlipBill(newInwardSlip.id, pendingBill);
        }
        
        setAlertType('success');
        setAlertTitle('Inward Slip Pass Created');
        setAlertMessage('Inward slip pass has been created successfully.');
        setAlertOpen(true);
        onOpenChange(false);
        onSuccess?.(newInwardSlip.id);
        return;
      }
      setAlertOpen(true);
      onOpenChange(false);
      onSuccess?.(inwardSlipId);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Error');
      setAlertMessage(error?.message || 'An error occurred');
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBillUpload = async (file: File): Promise<void> => {
    // If inward slip doesn't exist yet (create mode), store the file for later upload
    if (!inwardSlipId) {
      setPendingBill(file);
      setAlertType('success');
      setAlertTitle('Bill Queued');
      setAlertMessage('Bill will be uploaded after inward slip pass is created.');
      setAlertOpen(true);
      return Promise.resolve();
    }

    // If inward slip exists, upload immediately
    setUploading(true);
    try {
      const result = await inwardSlipPassesAPI.uploadInwardSlipBill(inwardSlipId, file);
      // Update formData with the new URL
      setFormData((prev) => ({
        ...prev,
        inward_slip_bill_image_url: result.url,
      }));
      setAlertType('success');
      setAlertTitle('Bill Uploaded');
      setAlertMessage('Inward slip bill has been uploaded successfully.');
      setAlertOpen(true);
    } catch (error: any) {
      setAlertType('error');
      setAlertTitle('Upload Failed');
      setAlertMessage(error?.message || 'Failed to upload bill');
      setAlertOpen(true);
      throw error; // Re-throw so DocumentUpload can handle it
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-4xl translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl font-semibold">
                  {isEditMode ? 'Update Inward Slip Pass' : 'Create Inward Slip Pass'}
                </Dialog.Title>
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingData ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading inward slip pass...</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Slip Number *</label>
                    <input
                      type="text"
                      value={formData.slip_number}
                      onChange={(e) => setFormData({ ...formData, slip_number: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      placeholder="ISP-001"
                    />
                    {errors.slip_number && <p className="mt-1 text-xs text-red-600">{errors.slip_number}</p>}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Date *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    />
                    {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Vehicle Number *</label>
                  {loadingTransporter ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm text-muted-foreground">Loading vehicle numbers...</span>
                    </div>
                  ) : vehicleNumbers.length > 1 ? (
                    <CustomSelect
                      value={formData.vehicle_number || null}
                      onChange={(value) => setFormData({ ...formData, vehicle_number: value || '' })}
                      options={vehicleNumbers.map((vn) => ({ value: vn, label: vn }))}
                      placeholder="Select vehicle number"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.vehicle_number}
                      onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                      placeholder={vehicleNumbers.length === 1 ? vehicleNumbers[0] : 'RJ114C6226'}
                    />
                  )}
                  {errors.vehicle_number && <p className="mt-1 text-xs text-red-600">{errors.vehicle_number}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Vendor Name *</label>
                  <input
                    type="text"
                    value={formData.party_name}
                    onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  />
                  {errors.party_name && <p className="mt-1 text-xs text-red-600">{errors.party_name}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Vendor Address *</label>
                  <input
                    type="text"
                    value={formData.party_address}
                    onChange={(e) => setFormData({ ...formData, party_address: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                  />
                  {errors.party_address && <p className="mt-1 text-xs text-red-600">{errors.party_address}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Vendor GST Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.party_gst_number || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, party_gst_number: e.target.value || null })
                    }
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    placeholder="23ABCDE1234F1Z5"
                  />
                </div>

                {isEditMode && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'completed' })}
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}

                <LotTable lots={lots} onLotsChange={setLots} errors={lotErrors} defaultRate={saudaRate} />

                {errors.lots && <p className="text-xs text-red-600">{errors.lots}</p>}

                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold">Documents</h3>
                  <DocumentUpload
                    label="Inward Slip Bill"
                    onUpload={handleBillUpload}
                    currentUrl={isEditMode ? formData.inward_slip_bill_image_url || undefined : undefined}
                    loading={uploading}
                  />
                  {!inwardSlipId && pendingBill && (
                    <p className="text-xs text-muted-foreground">
                      Bill queued for upload after inward slip pass is created.
                    </p>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading
                    ? isEditMode
                      ? 'Updating...'
                      : 'Creating...'
                    : isEditMode
                    ? 'Update Inward Slip Pass'
                    : 'Create Inward Slip Pass'}
                </button>
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

