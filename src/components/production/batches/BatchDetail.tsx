import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Package, Box } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { AlertDialog } from '../../shared/AlertDialog';
import { batchesAPI } from '../../../services/batches.api';
import { lotsAPI } from '../../../services/lots.api';
import { riceCodesAPI } from '../../../services/riceCodes.api';
import { inventoryAPI } from '../../../services/inventory.api';
import { useProducts } from '../../../hooks/useProducts';
import { usePackaging } from '../../../hooks/usePackaging';
import { useGodowns } from '../../../hooks/useGodowns';
import type { BatchWithDetails, BatchLotUsage, BatchRiceCodeUsage, FinishedGoodsInventory } from '../../../types/entities';
import { formatPacketTypeLabel } from '../../../constants/bagAndPacketTypes';

export function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products } = useProducts();
  const { packaging } = usePackaging();
  const { godowns } = useGodowns(true);
  const [batch, setBatch] = useState<BatchWithDetails | null>(null);
  const [lotUsage, setLotUsage] = useState<BatchLotUsage[]>([]);
  const [riceCodeUsage, setRiceCodeUsage] = useState<BatchRiceCodeUsage[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [riceCodes, setRiceCodes] = useState<any[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGoodsInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [batchData, lotUsageData, riceCodeUsageData, lotsData, riceCodesData, finishedGoodsData] = await Promise.all([
          batchesAPI.getBatchById(id),
          batchesAPI.getBatchLotUsage(id),
          batchesAPI.getBatchRiceCodeUsage(id),
          lotsAPI.getAllLots(),
          riceCodesAPI.getAllRiceCodes(),
          inventoryAPI.getFinishedGoods({ batch_id: id }),
        ]);
        setBatch(batchData);
        setLotUsage(lotUsageData);
        setRiceCodeUsage(riceCodeUsageData);
        setLots(lotsData);
        setRiceCodes(riceCodesData);
        setFinishedGoods(finishedGoodsData);
      } catch (error: any) {
        setAlertType('error');
        setAlertTitle('Error');
        setAlertMessage(error?.message || 'Failed to load batch details.');
        setAlertOpen(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const getLotDisplayName = (lotId: string): string => {
    const lot = lots.find((l) => l.id === lotId);
    if (!lot) return lotId;
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === lot.rice_code_id);
    return lot.lot_number || lotId;
  };

  const getRiceCodeName = (riceCodeId: string): string => {
    const riceCode = riceCodes.find((rc) => rc.rice_code_id === riceCodeId);
    return riceCode?.rice_code_name || riceCodeId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recipe_attached':
        return 'bg-blue-500/10 text-blue-600';
      case 'ready_to_pack':
        return 'bg-yellow-500/10 text-yellow-600';
      case 'packaged':
        return 'bg-green-500/10 text-green-600';
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-600';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-600';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Batch not found</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <button
          onClick={() => navigate('/production/batches')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Batches
        </button>

        <div className="hero-bg rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FlaskConical className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold font-mono text-primary">{batch.batch_number}</h1>
                  <span className={`px-3 py-1 rounded-md text-xs font-medium ${getStatusColor(batch.status)}`}>
                    {batch.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                {batch.godown_id && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Godown:{' '}
                    {godowns.find((g) => g.id === batch.godown_id)?.name ?? batch.godown_id}
                  </p>
                )}
                {batch.recipe && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Recipe: {batch.recipe.recipe_name}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Quantity</div>
              <div className="text-2xl font-bold mt-1">{batch.quantity.toFixed(2)} kg</div>
            </div>
          </div>
        </div>

        {/* Batch Info */}
        {batch.recipe && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-border rounded-lg bg-card">
              <div className="text-sm text-muted-foreground mb-1">Recipe Details</div>
              <div className="text-lg font-semibold mt-1">{batch.recipe.recipe_name}</div>
            </div>
            <div className="p-4 border border-border rounded-lg bg-card">
              <div className="text-sm text-muted-foreground mb-1">Created</div>
              <div className="text-sm font-medium mt-1">
                {new Date(batch.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        )}

        {/* Attached Products (Stage 2) */}
        {batch.products && batch.products.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Attached Products</h2>
            </div>
            <div className="space-y-2">
              {batch.products.map((bp) => {
                const product = products.find(p => p.id === bp.product_id);
                return (
                  <div key={bp.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                    <span className="text-sm font-medium">{product?.name || 'Unknown Product'}</span>
                    {product?.brand && (
                      <span className="text-xs text-muted-foreground ml-2">({product.brand})</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Attached Packaging (Stage 3) */}
        {batch.packaging_list && batch.packaging_list.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Box className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Attached Packaging</h2>
            </div>
            <div className="space-y-2">
              {batch.packaging_list.map((bpkg) => {
                const product = products.find(p => p.id === bpkg.product_id);
                const pkg = packaging.find(p => p.id === bpkg.packaging_id);
                const packetsNeeded = pkg ? Math.ceil(bpkg.quantity / pkg.holding_capacity) : 0;
                return (
                  <div key={bpkg.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{product?.name || 'Unknown Product'}</span>
                          <span className="text-xs text-muted-foreground">
                            {pkg ? ` - ${pkg.holding_capacity}kg ${formatPacketTypeLabel(pkg.packet_type)}` : ''}
                          </span>
                          {pkg?.packaging_number && (
                            <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              {pkg.packaging_number}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {bpkg.quantity.toFixed(2)} kg ({packetsNeeded} packets)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Finished Goods Inventory (Multiple entries per batch) */}
        {finishedGoods.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="p-4 bg-muted/50 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Finished Goods Inventory</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    This batch produced {finishedGoods.length} packaging size{finishedGoods.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Total Packets</div>
                  <div className="text-lg font-semibold font-mono">
                    {finishedGoods.reduce((sum, fg) => {
                      const packets = typeof fg.no_of_packets === 'string' 
                        ? parseInt(fg.no_of_packets) 
                        : fg.no_of_packets;
                      return sum + packets;
                    }, 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-sm font-semibold">Packaging</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Packaging Number</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Packets</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Total Weight (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {finishedGoods.map((fg) => {
                    const packets = typeof fg.no_of_packets === 'string' 
                      ? parseInt(fg.no_of_packets) 
                      : fg.no_of_packets;
                    const weight = typeof fg.total_weight === 'string' 
                      ? parseFloat(fg.total_weight) 
                      : (fg.total_weight || 0);
                    
                    return (
                      <tr key={fg.id} className="border-b border-border/60 hover:bg-muted/30">
                        <td className="py-3 px-4 text-sm">
                          {fg.packaging ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-lg bg-sky-500/10 text-sky-700">
                              {formatPacketTypeLabel(fg.packaging.packet_type)} ({fg.packaging.holding_capacity}kg)
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {fg.packaging?.packaging_number ? (
                            <span className="font-mono font-semibold text-primary">{fg.packaging.packaging_number}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-mono">{packets.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm text-right font-mono">{weight.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {finishedGoods.length > 1 && (
                  <tfoot className="bg-muted/20">
                    <tr>
                      <td className="py-3 px-4 text-sm font-semibold">Total</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">-</td>
                      <td className="py-3 px-4 text-sm text-right font-mono font-semibold">
                        {finishedGoods.reduce((sum, fg) => {
                          const packets = typeof fg.no_of_packets === 'string' 
                            ? parseInt(fg.no_of_packets) 
                            : fg.no_of_packets;
                          return sum + packets;
                        }, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-mono font-semibold">
                        {finishedGoods.reduce((sum, fg) => {
                          const weight = typeof fg.total_weight === 'string' 
                            ? parseFloat(fg.total_weight) 
                            : (fg.total_weight || 0);
                          return sum + weight;
                        }, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Lot Usage */}
        {lotUsage.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="p-4 bg-muted/50 border-b border-border">
              <h2 className="font-semibold">Lot-Level Usage</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-sm font-semibold">Lot</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Quantity Used (kg)</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {lotUsage.map((usage) => (
                    <tr key={usage.id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="py-3 px-4 text-sm">{getLotDisplayName(usage.lot_id)}</td>
                      <td className="py-3 px-4 text-sm text-right">{usage.quantity_used.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm text-right">{usage.percentage_used.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rice Code Usage */}
        {riceCodeUsage.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="p-4 bg-muted/50 border-b border-border">
              <h2 className="font-semibold">Rice Code-Level Usage (Aggregated)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 text-sm font-semibold">Rice Code</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold">Rice Type</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold">Total Quantity Used (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {riceCodeUsage.map((usage) => (
                    <tr key={usage.id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="py-3 px-4 text-sm">{getRiceCodeName(usage.rice_code_id)}</td>
                      <td className="py-3 px-4 text-sm">{usage.rice_type || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-right">{usage.total_quantity_used.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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

