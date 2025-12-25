import { useState } from 'react';
import { Package, Box, Database, ShoppingBag, TrendingUp } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { useInventory } from '../../../hooks/useInventory';
import { FinishedGoodsTable } from './FinishedGoodsTable';
import { PacketsTable } from './PacketsTable';
import { LotsTable } from './LotsTable';
import { BagsTable } from './BagsTable';

export function InventoryDashboard() {
  const { summary, loading, refetch } = useInventory();
  const [activeTab, setActiveTab] = useState<'summary' | 'finished' | 'packets' | 'lots' | 'bags'>('summary');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border border-border rounded-lg bg-gradient-to-br from-background to-muted/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Finished Goods</div>
                <div className="text-2xl font-bold mt-1">
                  {typeof summary.finished_goods.total_packets === 'string' 
                    ? parseInt(summary.finished_goods.total_packets) 
                    : summary.finished_goods.total_packets}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const weight = summary.finished_goods.total_weight_kg;
                    const numWeight = typeof weight === 'string' ? parseFloat(weight) : (weight || 0);
                    return isNaN(numWeight) ? '0.00' : numWeight.toFixed(2);
                  })()} kg
                </div>
              </div>
              <Package className="h-8 w-8 text-primary opacity-50" />
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg bg-gradient-to-br from-background to-muted/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Empty Packets</div>
                <div className="text-2xl font-bold mt-1">
                  {typeof summary.packets.total_empty_packets === 'string' 
                    ? parseInt(summary.packets.total_empty_packets) 
                    : summary.packets.total_empty_packets}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {typeof summary.packets.types === 'string' ? parseInt(summary.packets.types) : summary.packets.types} type{summary.packets.types !== 1 ? 's' : ''}
                </div>
              </div>
              <Box className="h-8 w-8 text-primary opacity-50" />
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg bg-gradient-to-br from-background to-muted/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Lots Inventory</div>
                <div className="text-2xl font-bold mt-1">
                  {(() => {
                    const qty = summary.lots.total_available_quantity_kg;
                    const numQty = typeof qty === 'string' ? parseFloat(qty) : (qty || 0);
                    return isNaN(numQty) ? '0.00' : numQty.toFixed(2);
                  })()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {typeof summary.lots.active_lots === 'string' ? parseInt(summary.lots.active_lots) : summary.lots.active_lots} active lot{summary.lots.active_lots !== 1 ? 's' : ''}
                </div>
              </div>
              <Database className="h-8 w-8 text-primary opacity-50" />
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg bg-gradient-to-br from-background to-muted/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Bags</div>
                <div className="text-2xl font-bold mt-1">
                  {(typeof summary.bags.total_filled_bags === 'string' ? parseInt(summary.bags.total_filled_bags) : summary.bags.total_filled_bags) + 
                   (typeof summary.bags.total_empty_bags === 'string' ? parseInt(summary.bags.total_empty_bags) : summary.bags.total_empty_bags)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {typeof summary.bags.total_filled_bags === 'string' ? parseInt(summary.bags.total_filled_bags) : summary.bags.total_filled_bags} filled,{' '}
                  {typeof summary.bags.total_empty_bags === 'string' ? parseInt(summary.bags.total_empty_bags) : summary.bags.total_empty_bags} empty
                </div>
              </div>
              <ShoppingBag className="h-8 w-8 text-primary opacity-50" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-4">
          {[
            { id: 'summary', label: 'Summary', icon: TrendingUp },
            { id: 'finished', label: 'Finished Goods', icon: Package },
            { id: 'packets', label: 'Packets', icon: Box },
            { id: 'lots', label: 'Lots', icon: Database },
            { id: 'bags', label: 'Bags', icon: ShoppingBag },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : (
        <div>
          {activeTab === 'summary' && summary && (
            <div className="space-y-4">
              <p className="text-muted-foreground">View detailed inventory in the tabs above.</p>
            </div>
          )}
          {activeTab === 'finished' && <FinishedGoodsTable />}
          {activeTab === 'packets' && <PacketsTable />}
          {activeTab === 'lots' && <LotsTable />}
          {activeTab === 'bags' && <BagsTable />}
        </div>
      )}
    </div>
  );
}

