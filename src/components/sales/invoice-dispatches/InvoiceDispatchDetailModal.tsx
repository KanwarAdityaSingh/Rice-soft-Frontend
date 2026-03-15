import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle, FileDigit, Truck, Package, AlertTriangle } from 'lucide-react';
import { useInvoiceDispatches } from '../../../hooks/useInvoiceDispatches';
import { useTransporters } from '../../../hooks/useTransporters';
import { useVehicleMap } from '../../../hooks/useVehicles';
import { usePackaging } from '../../../hooks/usePackaging';
import { inventoryAPI } from '../../../services/inventory.api';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { toast } from '../../../utils/toast';
import type { InvoiceDispatch, EInvoice, EWayBill } from '../../../types/sales';

interface InvoiceDispatchDetailModalProps {
  dispatchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  getProductName: (id: string) => string;
}

export function InvoiceDispatchDetailModal({
  dispatchId,
  open,
  onOpenChange,
  onSuccess,
  getProductName,
}: InvoiceDispatchDetailModalProps) {
  const { getById, confirm, getEInvoice, getEWayBills, generateEInvoice, generateEWayBill } = useInvoiceDispatches();
  const { transporters } = useTransporters();
  const { getVehicleNumber } = useVehicleMap();
  const { packaging } = usePackaging();

  const [dispatch, setDispatch] = useState<InvoiceDispatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [eInvoice, setEInvoice] = useState<EInvoice | null | undefined>(undefined);
  const [eWayBills, setEWayBills] = useState<EWayBill[]>([]);
  const [fgiByProduct, setFgiByProduct] = useState<Record<string, number>>({});
  const [loadingFgi, setLoadingFgi] = useState(false);

  useEffect(() => {
    if (open && dispatchId) {
      setLoading(true);
      getById(dispatchId)
        .then(setDispatch)
        .catch(() => setDispatch(null))
        .finally(() => setLoading(false));
    } else {
      setDispatch(null);
      setEInvoice(undefined);
      setEWayBills([]);
      setFgiByProduct({});
    }
  }, [open, dispatchId, getById]);

  useEffect(() => {
    if (!open || !dispatchId || !dispatch) return;
    if (dispatch.status === 'confirmed') {
      getEInvoice(dispatchId).then(setEInvoice).catch(() => setEInvoice(null));
      getEWayBills(dispatchId).then(setEWayBills).catch(() => setEWayBills([]));
    } else {
      setEInvoice(undefined);
      setEWayBills([]);
    }
  }, [open, dispatchId, dispatch?.status, getEInvoice, getEWayBills]);

  useEffect(() => {
    if (!open || !dispatch || dispatch.status !== 'draft' || !dispatch.lines?.length) {
      setFgiByProduct({});
      return;
    }
    setLoadingFgi(true);
    inventoryAPI
      .getFinishedGoods()
      .then((rows) => {
        const byProduct: Record<string, number> = {};
        const list = Array.isArray(rows) ? rows : [];
        for (const row of list) {
          const weight = Number(row.total_weight) || 0;
          if (row.product_id) {
            byProduct[row.product_id] = (byProduct[row.product_id] ?? 0) + weight;
          }
        }
        setFgiByProduct(byProduct);
      })
      .catch(() => setFgiByProduct({}))
      .finally(() => setLoadingFgi(false));
  }, [open, dispatch?.id, dispatch?.status, dispatch?.lines?.length]);

  const runAction = async (
    key: string,
    fn: () => Promise<unknown>
  ) => {
    setActionLoading(key);
    try {
      await fn();
      if (key === 'confirm') {
        toast.success(
          'Dispatch confirmed',
          'Inventory has been deducted.'
        );
      }
      const updated = await getById(dispatchId!);
      setDispatch(updated);
      if (key === 'e-invoice' && dispatchId) {
        const einv = await getEInvoice(dispatchId);
        setEInvoice(einv);
      }
      if (key === 'e-way' && dispatchId) {
        const ewb = await getEWayBills(dispatchId);
        setEWayBills(ewb);
      }
      onSuccess?.();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Action failed';
      toast.error('Error', msg);
    } finally {
      setActionLoading(null);
    }
  };

  const transporterName = (id: string | null) =>
    id ? transporters.find((t) => t.id === id)?.business_name ?? id : '–';

  const getPackagingLabel = (packagingId: string | null) => {
    if (!packagingId) return '–';
    const p = packaging.find((x) => x.id === packagingId);
    return p ? `${p.holding_capacity} kg (${p.packet_type})` : packagingId;
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-[95vw] max-w-2xl translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl border bg-background p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">Invoice Dispatch</Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-lg p-2 hover:bg-muted" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : dispatch ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Internal invoice #</span>
                  <p className="font-medium">{dispatch.internal_invoice_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium capitalize">{dispatch.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Dispatch date</span>
                  <p className="font-medium">{dispatch.dispatch_date}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Party</span>
                  <p className="font-medium">{dispatch.party_name}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Address</span>
                  <p className="font-medium">{dispatch.party_address ?? '–'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">GST</span>
                  <p className="font-medium">{dispatch.party_gst_number ?? '–'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">PAN</span>
                  <p className="font-medium">{dispatch.party_pan_number ?? '–'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Transporter</span>
                  <p className="font-medium">{transporterName(dispatch.transporter_id)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Vehicle</span>
                  <p className="font-medium">{dispatch.vehicle_id ? getVehicleNumber(dispatch.vehicle_id) : '–'}</p>
                </div>
                {dispatch.distance_km != null && (
                  <div>
                    <span className="text-muted-foreground">Distance (km)</span>
                    <p className="font-medium">{dispatch.distance_km}</p>
                  </div>
                )}
                {dispatch.route_description && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Route</span>
                    <p className="font-medium">{dispatch.route_description}</p>
                  </div>
                )}
              </div>
              {dispatch.lines && dispatch.lines.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Lines</h4>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left p-2 font-medium">Product</th>
                          <th className="text-left p-2 font-medium">Bag</th>
                          <th className="text-right p-2 font-medium">Qty</th>
                          <th className="text-right p-2 font-medium">Rate</th>
                          <th className="text-right p-2 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dispatch.lines.map((l) => (
                          <tr key={l.id} className="border-b last:border-0">
                            <td className="p-2">{getProductName(l.product_id)}</td>
                            <td className="p-2">{getPackagingLabel(l.packaging_id)}</td>
                            <td className="p-2 text-right">
                              {l.quantity} {l.quantity_unit}
                            </td>
                            <td className="p-2 text-right">{l.rate}</td>
                            <td className="p-2 text-right">{l.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {dispatch.status === 'draft' && dispatch.lines && dispatch.lines.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" /> Available stock (before confirm)
                  </h4>
                  {loadingFgi ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="p-2 font-medium">Product</th>
                            <th className="p-2 text-right font-medium">Required (kg)</th>
                            <th className="p-2 text-right font-medium">Available (kg)</th>
                            <th className="p-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dispatch.lines.map((l) => {
                            const required = Number(l.quantity) || 0;
                            const available = Number(fgiByProduct[l.product_id]) || 0;
                            const sufficient = available >= required;
                            return (
                              <tr key={l.id} className="border-b last:border-0">
                                <td className="p-2">{getProductName(l.product_id)}</td>
                                <td className="p-2 text-right">{required}</td>
                                <td className="p-2 text-right">{available.toFixed(2)}</td>
                                <td className="p-2">
                                  {sufficient ? (
                                    <span className="text-green-600 dark:text-green-400">Sufficient</span>
                                  ) : (
                                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                      <AlertTriangle className="h-3.5 w-3.5" /> Insufficient
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {dispatch.status === 'confirmed' && eInvoice !== undefined && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileDigit className="h-4 w-4" /> E-Invoice
                  </h4>
                  {eInvoice == null ? (
                    <p className="text-sm text-muted-foreground">Not generated yet. Use the button below to generate.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {eInvoice.irn && (
                        <div>
                          <span className="text-muted-foreground">IRN</span>
                          <p className="font-medium break-all">{eInvoice.irn}</p>
                        </div>
                      )}
                      {eInvoice.acknowledgement_number && (
                        <div>
                          <span className="text-muted-foreground">Ack. number</span>
                          <p className="font-medium">{eInvoice.acknowledgement_number}</p>
                        </div>
                      )}
                      {eInvoice.ack_date && (
                        <div>
                          <span className="text-muted-foreground">Ack. date</span>
                          <p className="font-medium">{eInvoice.ack_date}</p>
                        </div>
                      )}
                      {eInvoice.qr_code_content && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">QR content</span>
                          <p className="font-mono text-xs break-all mt-0.5">{eInvoice.qr_code_content}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {dispatch.status === 'confirmed' && eWayBills.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" /> E-Way Bill(s)
                  </h4>
                  <div className="space-y-2">
                    {eWayBills.map((ewb) => (
                      <div key={ewb.id} className="rounded border bg-background/60 p-2 text-sm">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {ewb.eway_bill_number && (
                            <div>
                              <span className="text-muted-foreground">EWB number</span>
                              <p className="font-medium">{ewb.eway_bill_number}</p>
                            </div>
                          )}
                          {ewb.vehicle_number && (
                            <div>
                              <span className="text-muted-foreground">Vehicle</span>
                              <p className="font-medium">{ewb.vehicle_number}</p>
                            </div>
                          )}
                          {ewb.distance_km != null && (
                            <div>
                              <span className="text-muted-foreground">Distance (km)</span>
                              <p className="font-medium">{ewb.distance_km}</p>
                            </div>
                          )}
                          {ewb.route && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Route</span>
                              <p className="font-medium">{ewb.route}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {dispatch.status === 'draft' && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <button
                    type="button"
                    disabled={!!actionLoading}
                    onClick={() =>
                      runAction('confirm', () => confirm(dispatch.id))
                    }
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {actionLoading === 'confirm' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <CheckCircle className="h-4 w-4" /> Confirm Dispatch
                  </button>
                </div>
              )}
              {dispatch.status === 'confirmed' && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <button
                    type="button"
                    disabled={!!actionLoading}
                    onClick={() =>
                      runAction('e-invoice', () => generateEInvoice(dispatch.id))
                    }
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-muted hover:bg-muted/80 disabled:opacity-50"
                  >
                    {actionLoading === 'e-invoice' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <FileDigit className="h-4 w-4" /> Generate E-Invoice
                  </button>
                  <button
                    type="button"
                    disabled={!!actionLoading}
                    onClick={() =>
                      runAction('e-way', () => generateEWayBill(dispatch.id))
                    }
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-muted hover:bg-muted/80 disabled:opacity-50"
                  >
                    {actionLoading === 'e-way' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <Truck className="h-4 w-4" /> Generate E-Way Bill
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Could not load dispatch.</p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
