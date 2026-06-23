import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FileText, X } from 'lucide-react';
import {
  formatIspSlipLabel,
  getVehicleLinkedIsps,
  type VehicleLinkedIsp,
} from '../../../utils/vehicleIspLinks';
import type { InwardSlipPass, RiceCode, RiceType, Sauda } from '../../../types/entities';

interface VehicleLinkedIspsListProps {
  vehicleId: string;
  vehicleNumber?: string;
  inwardSlipPasses: InwardSlipPass[];
  saudas: Sauda[];
  riceCodes: RiceCode[];
  riceTypes: RiceType[];
}

function IspBlock({ isp }: { isp: VehicleLinkedIsp }) {
  const slipLabel = formatIspSlipLabel(isp.slipNumber);

  return (
    <li className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-sm font-medium text-foreground">
        {slipLabel}
        {isp.partyName ? ` · ${isp.partyName}` : ''}
      </div>
      <div className="mt-1.5 text-sm text-muted-foreground">
        <span className="font-medium text-foreground/80">Saudas: </span>
        {isp.saudaLabels.length > 0 ? isp.saudaLabels.join(', ') : 'None linked'}
      </div>
    </li>
  );
}

export function VehicleLinkedIspsList({
  vehicleId,
  vehicleNumber,
  inwardSlipPasses,
  saudas,
  riceCodes,
  riceTypes,
}: VehicleLinkedIspsListProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const linkedIsps = getVehicleLinkedIsps(
    vehicleId,
    inwardSlipPasses,
    saudas,
    riceCodes,
    riceTypes
  );

  if (linkedIsps.length === 0) {
    return <span className="text-muted-foreground text-sm">None</span>;
  }

  const ispCountLabel = `${linkedIsps.length} ISP${linkedIsps.length === 1 ? '' : 's'}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <FileText className="h-3.5 w-3.5 shrink-0" />
        {ispCountLabel}
      </button>

      <Dialog.Root open={previewOpen} onOpenChange={setPreviewOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:w-[90vw] md:w-full max-w-lg translate-x-[-50%] translate-y-[-50%]">
            <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-primary/20 rounded-lg shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <Dialog.Title className="text-lg font-semibold">
                      Linked ISPs
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-muted-foreground mt-0.5">
                      {vehicleNumber
                        ? `${vehicleNumber} · ${ispCountLabel}`
                        : ispCountLabel}
                    </Dialog.Description>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <ul className="space-y-2.5">
                {linkedIsps.map((isp) => (
                  <IspBlock key={isp.id} isp={isp} />
                ))}
              </ul>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
