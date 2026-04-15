import { useState, useEffect, useCallback } from 'react';
import { Database, Eye } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { EmptyState } from '../../admin/shared/EmptyState';
import { useInventory } from '../../../hooks/useInventory';
import { lotsAPI } from '../../../services/lots.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { InventoryAuditModal } from './InventoryAuditModal';
import { inventoryAuditAPI, type LotInventoryAuditResponse } from '../../../services/inventoryAudit.api';
import type { LotsInventory } from '../../../types/entities';

function formatLotDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN');
}

function parseQty(v: number | string | undefined | null): number {
  if (v === undefined || v === null) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

interface LotsTableProps {
  /** When set, calls GET /inventory/lots?godown_id=… */
  godownId?: string;
}

export function LotsTable({ godownId }: LotsTableProps) {
  const { lots: lotsInventory, loading: initialLoading, fetchLots } = useInventory();
  const [lots, setLots] = useState<any[]>([]);
  const [riceCodes, setRiceCodes] = useState<any[]>([]);
  const [refetching, setRefetching] = useState(false);

  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditData, setAuditData] = useState<LotInventoryAuditResponse[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedLot, setSelectedLot] = useState<{ id: string; name: string } | null>(null);

  const loadLotsForGodown = useCallback(async () => {
    setRefetching(true);
    try {
      await fetchLots(godownId ? { godown_id: godownId } : undefined);
    } finally {
      setRefetching(false);
    }
  }, [godownId, fetchLots]);

  useEffect(() => {
    loadLotsForGodown();
  }, [loadLotsForGodown]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [lotsData, riceCodesData] = await Promise.all([
          lotsAPI.getAllLots(),
          riceCodesAPI.getAllRiceCodes(),
        ]);
        setLots(lotsData);
        setRiceCodes(riceCodesData);
      } catch (error) {
        console.error('Failed to fetch lots / rice codes:', error);
      }
    };
    fetchMeta();
  }, []);

  const getLotDisplayName = (li: LotsInventory): string => {
    const nested = li.lot;
    const riceCodeId = nested?.rice_code_id ?? lots.find((l) => l.id === li.lot_id)?.rice_code_id;
    const lotNum = nested?.lot_number ?? lots.find((l) => l.id === li.lot_id)?.lot_number;
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === riceCodeId);
    const parts: string[] = [];
    if (lotNum) parts.push(`Lot ${lotNum}`);
    if (riceCode?.rice_code_name) parts.push(riceCode.rice_code_name);
    return parts.join(' — ') || li.lot_id;
  };

  const getRiceType = (li: LotsInventory): string => {
    const nested = li.lot?.rice_type;
    if (nested) return nested;
    const lot = lots.find((l) => l.id === li.lot_id);
    return lot?.rice_type || '—';
  };

  const getCreatedAt = (li: LotsInventory): string | undefined => {
    const lot = lots.find((l) => l.id === li.lot_id);
    if (!lot) return undefined;
    const isp = lot.inward_slip_pass_created_at?.trim();
    return isp || lot.created_at;
  };

  const openLotAudit = async (li: LotsInventory) => {
    const lotId = li.lot_id;
    const lotName = getLotDisplayName(li);
    setSelectedLot({ id: lotId, name: lotName });
    setAuditModalOpen(true);
    setAuditLoading(true);

    try {
      const data = await inventoryAuditAPI.getLotAuditByLotId(lotId, 100);
      setAuditData(data);
    } catch (error) {
      console.error('Failed to fetch lot audit:', error);
      setAuditData([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const loading = initialLoading || refetching;

  if (loading && lotsInventory.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (lotsInventory.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Database}
          title="No lot inventory"
          description="Bulk purchase stock by lot appears here after inward slips create lots. Try another godown or clear the filter."
        />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-14">
                S. No.
              </th>
              <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                Date
              </th>
              <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Lot
              </th>
              <th className="text-left py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Rice type
              </th>
              <th className="text-right py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                Received (kg)
              </th>
              <th className="text-right py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Available (kg)
              </th>
              <th className="text-center py-4 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {lotsInventory.map((li, index) => {
              const availableQty = parseQty(li.available_quantity);
              const received = parseQty(li.lot?.received_weight);
              const rowKey = `${li.id ?? ''}-${li.godown_id ?? 'all'}-${li.lot_id}`;

              return (
                <tr key={rowKey} className="group hover:bg-muted/30 transition-colors">
                  <td className="py-4 px-5 text-sm tabular-nums text-muted-foreground">{index + 1}</td>
                  <td className="py-4 px-5 text-sm whitespace-nowrap text-muted-foreground">
                    {formatLotDate(getCreatedAt(li))}
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Database className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{getLotDisplayName(li)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                          {li.lot_id.slice(0, 8)}…
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-sm text-foreground">{getRiceType(li)}</span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <span className="text-sm font-mono tabular-nums text-muted-foreground">
                      {received > 0 ? formatNumber(received) : '—'}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-lg font-bold font-mono text-foreground">{formatNumber(availableQty)}</span>
                      <span className="text-sm text-muted-foreground">kg</span>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <button
                      type="button"
                      onClick={() => openLotAudit(li)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
                      title="View history"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>History</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InventoryAuditModal
        open={auditModalOpen}
        onOpenChange={setAuditModalOpen}
        title={selectedLot ? `${selectedLot.name} - History` : 'Lot History'}
        subtitle="Complete transaction history for this lot"
        auditType="lot"
        data={auditData}
        loading={auditLoading}
      />
    </>
  );
}
