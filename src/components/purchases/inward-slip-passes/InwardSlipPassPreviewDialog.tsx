import * as Dialog from '@radix-ui/react-dialog';
import { X, FileText, Truck, Calendar, User, MapPin, DollarSign } from 'lucide-react';
import type { InwardSlipPass } from '../../../types/entities';

interface InwardSlipPassPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isp: InwardSlipPass | null;
}

export function InwardSlipPassPreviewDialog({ open, onOpenChange, isp }: InwardSlipPassPreviewDialogProps) {
  if (!isp) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-2xl translate-x-[-50%] translate-y-[-50%]">
          <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <Dialog.Title className="text-xl sm:text-2xl font-semibold">
                    Inward Slip Pass Details
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground mt-1">
                    {isp.slip_number}
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

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Slip Number</label>
                  <p className="mt-1 text-sm font-medium">{isp.slip_number}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Status</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 rounded-md text-xs ${
                      isp.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-yellow-500/10 text-yellow-600'
                    }`}>
                      {isp.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Date
                  </label>
                  <p className="mt-1 text-sm font-medium">{new Date(isp.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Vehicle Number
                  </label>
                  <p className="mt-1 text-sm font-medium">{isp.vehicle_number}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Party Name
                  </label>
                  <p className="mt-1 text-sm font-medium">{isp.party_name}</p>
                </div>
                {isp.party_address && (
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Party Address
                    </label>
                    <p className="mt-1 text-sm">{isp.party_address}</p>
                  </div>
                )}
                {isp.party_gst_number && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">GST Number</label>
                    <p className="mt-1 text-sm font-medium">{isp.party_gst_number}</p>
                  </div>
                )}
                {isp.transporter_id && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">Transporter ID</label>
                    <p className="mt-1 text-sm font-medium">{isp.transporter_id}</p>
                  </div>
                )}
                {isp.transportation_cost != null && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Transportation Cost
                    </label>
                    <p className="mt-1 text-sm font-medium">₹{isp.transportation_cost.toFixed(2)}</p>
                  </div>
                )}
                {isp.eway_bill_number && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wide">Eway Bill</label>
                    <p className="mt-1 text-sm font-medium">{isp.eway_bill_number}</p>
                  </div>
                )}
              </div>

              {(isp.inward_slip_bill_image_url || isp.transportation_bill_image_url || isp.bill_pdf_url || isp.bilti_image_url || isp.eway_bill_url) && (
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold mb-3">Documents</h3>
                  <div className="space-y-2">
                    {isp.inward_slip_bill_image_url && (
                      <a href={isp.inward_slip_bill_image_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                        View Inward Slip Bill
                      </a>
                    )}
                    {isp.transportation_bill_image_url && (
                      <a href={isp.transportation_bill_image_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline block">
                        View Transportation Bill
                      </a>
                    )}
                    {isp.bill_pdf_url && (
                      <a href={isp.bill_pdf_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline block">
                        View Purchase Bill PDF
                      </a>
                    )}
                    {isp.bilti_image_url && (
                      <a href={isp.bilti_image_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline block">
                        View Bilti
                      </a>
                    )}
                    {isp.eway_bill_url && (
                      <a href={isp.eway_bill_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline block">
                        View Eway Bill
                      </a>
                    )}
                  </div>
                </div>
              )}

              {isp.notes && (
                <div className="pt-4 border-t border-border">
                  <label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</label>
                  <p className="mt-1 text-sm">{isp.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  <p>Created: {new Date(isp.created_at).toLocaleString()}</p>
                  {isp.updated_at !== isp.created_at && (
                    <p className="mt-1">Updated: {new Date(isp.updated_at).toLocaleString()}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

