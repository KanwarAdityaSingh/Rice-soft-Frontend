import { useState } from 'react';
import { Package, Box, Database, ShoppingBag, Eye, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { LoadingSpinner } from '../../admin/shared/LoadingSpinner';
import { useInventory } from '../../../hooks/useInventory';
import { FinishedGoodsTable } from './FinishedGoodsTable';
import { PacketsTable } from './PacketsTable';
import { LotsTable } from './LotsTable';
import { BagsTable } from './BagsTable';
import { InventoryAuditModal } from './InventoryAuditModal';
import { inventoryAuditAPI } from '../../../services/inventoryAudit.api';
import type {
  LotInventoryAuditResponse,
  PacketsInventoryAuditResponse,
  BagsInventoryAuditResponse,
  FinishedGoodsInventoryAuditResponse,
} from '../../../services/inventoryAudit.api';

type TabId = 'finished' | 'packets' | 'lots' | 'bags';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

const tabs: Tab[] = [
  { 
    id: 'finished', 
    label: 'Finished Goods', 
    icon: Package,
    color: 'text-violet-600',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
  },
  { 
    id: 'packets', 
    label: 'Packets', 
    icon: Box,
    color: 'text-sky-600',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
  },
  { 
    id: 'lots', 
    label: 'Lots', 
    icon: Database,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  { 
    id: 'bags', 
    label: 'Bags', 
    icon: ShoppingBag,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
];

export function InventoryDashboard() {
  const { summary, loading, refetch } = useInventory();
  const [activeTab, setActiveTab] = useState<TabId>('finished');
  
  // Audit modal state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditModalTitle, setAuditModalTitle] = useState('');
  const [auditModalSubtitle, setAuditModalSubtitle] = useState('');
  const [auditType, setAuditType] = useState<'lot' | 'packets' | 'bags' | 'finished_goods'>('lot');
  const [auditData, setAuditData] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const openAuditModal = async (type: 'lot' | 'packets' | 'bags' | 'finished_goods') => {
    setAuditType(type);
    setAuditLoading(true);
    setAuditModalOpen(true);

    const titles: Record<typeof type, { title: string; subtitle: string }> = {
      lot: { title: 'Lots Inventory Ledger', subtitle: 'Complete history of all lot inventory changes' },
      packets: { title: 'Packets Inventory Ledger', subtitle: 'Complete history of all packet inventory changes' },
      bags: { title: 'Bags Inventory Ledger', subtitle: 'Complete history of all bag inventory changes' },
      finished_goods: { title: 'Finished Goods Ledger', subtitle: 'Complete history of all finished goods changes' },
    };
    
    setAuditModalTitle(titles[type].title);
    setAuditModalSubtitle(titles[type].subtitle);

    try {
      let data: any[] = [];
      switch (type) {
        case 'lot':
          data = await inventoryAuditAPI.getLotAuditRecent(200);
          break;
        case 'packets':
          data = await inventoryAuditAPI.getPacketsAuditRecent(200);
          break;
        case 'bags':
          data = await inventoryAuditAPI.getBagsAuditRecent(200);
          break;
        case 'finished_goods':
          data = await inventoryAuditAPI.getFinishedGoodsAuditRecent(200);
          break;
      }
      setAuditData(data);
    } catch (error) {
      console.error('Failed to fetch audit data:', error);
      setAuditData([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const getStatValue = (val: any, decimals = 0): string => {
    const num = typeof val === 'string' ? parseFloat(val) : (val || 0);
    return isNaN(num) ? '0' : num.toLocaleString('en-IN', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Inventory Overview Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Finished Goods Card */}
          <button 
            onClick={() => setActiveTab('finished')}
            className={`group relative p-5 rounded-2xl border transition-all duration-300 text-left ${
              activeTab === 'finished' 
                ? 'bg-violet-500/10 border-violet-500/40 shadow-lg shadow-violet-500/10' 
                : 'bg-card border-border hover:border-violet-500/30 hover:bg-violet-500/5'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Package className={`h-4 w-4 ${activeTab === 'finished' ? 'text-violet-600' : ''}`} />
                  Finished Goods
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {getStatValue(summary.finished_goods.total_packets)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {getStatValue(summary.finished_goods.total_weight_kg, 2)} kg total
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); openAuditModal('finished_goods'); }}
                className="p-2 rounded-lg bg-violet-500/10 text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-violet-500/20"
                title="View Ledger"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r from-violet-500 to-purple-500 ${activeTab === 'finished' ? 'opacity-100' : 'opacity-0'}`} />
          </button>

          {/* Packets Card */}
          <button 
            onClick={() => setActiveTab('packets')}
            className={`group relative p-5 rounded-2xl border transition-all duration-300 text-left ${
              activeTab === 'packets' 
                ? 'bg-sky-500/10 border-sky-500/40 shadow-lg shadow-sky-500/10' 
                : 'bg-card border-border hover:border-sky-500/30 hover:bg-sky-500/5'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Box className={`h-4 w-4 ${activeTab === 'packets' ? 'text-sky-600' : ''}`} />
                  Empty Packets
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {getStatValue(summary.packets.total_empty_packets)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {getStatValue(summary.packets.types)} types available
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); openAuditModal('packets'); }}
                className="p-2 rounded-lg bg-sky-500/10 text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sky-500/20"
                title="View Ledger"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r from-sky-500 to-cyan-500 ${activeTab === 'packets' ? 'opacity-100' : 'opacity-0'}`} />
          </button>

          {/* Lots Card */}
          <button 
            onClick={() => setActiveTab('lots')}
            className={`group relative p-5 rounded-2xl border transition-all duration-300 text-left ${
              activeTab === 'lots' 
                ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10' 
                : 'bg-card border-border hover:border-amber-500/30 hover:bg-amber-500/5'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Database className={`h-4 w-4 ${activeTab === 'lots' ? 'text-amber-600' : ''}`} />
                  Lots Inventory
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {getStatValue(summary.lots.total_available_quantity_kg, 2)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {getStatValue(summary.lots.active_lots)} active lots
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); openAuditModal('lot'); }}
                className="p-2 rounded-lg bg-amber-500/10 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500/20"
                title="View Ledger"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r from-amber-500 to-orange-500 ${activeTab === 'lots' ? 'opacity-100' : 'opacity-0'}`} />
          </button>

          {/* Bags Card */}
          <button 
            onClick={() => setActiveTab('bags')}
            className={`group relative p-5 rounded-2xl border transition-all duration-300 text-left ${
              activeTab === 'bags' 
                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10' 
                : 'bg-card border-border hover:border-emerald-500/30 hover:bg-emerald-500/5'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <ShoppingBag className={`h-4 w-4 ${activeTab === 'bags' ? 'text-emerald-600' : ''}`} />
                  Bags
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {getStatValue(Number(summary.bags.total_filled_bags) + Number(summary.bags.total_empty_bags))}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    {getStatValue(summary.bags.total_filled_bags)} filled
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-muted-foreground" />
                    {getStatValue(summary.bags.total_empty_bags)} empty
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); openAuditModal('bags'); }}
                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-500/20"
                title="View Ledger"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r from-emerald-500 to-teal-500 ${activeTab === 'bags' ? 'opacity-100' : 'opacity-0'}`} />
          </button>
        </div>
      )}

      {/* Tab Content Header */}
      {activeTabData && (
        <div className={`flex items-center justify-between p-4 rounded-xl ${activeTabData.bgColor} border ${activeTabData.borderColor}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${activeTabData.bgColor} ${activeTabData.color}`}>
              <activeTabData.icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{activeTabData.label}</h2>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'finished' && 'Packaged products ready for sale'}
                {activeTab === 'packets' && 'Empty packaging materials in stock'}
                {activeTab === 'lots' && 'Raw material lots from purchases'}
                {activeTab === 'bags' && 'Jute and PP bags inventory'}
              </p>
            </div>
          </div>
          <button
            onClick={() => openAuditModal(
              activeTab === 'finished' ? 'finished_goods' : 
              activeTab === 'packets' ? 'packets' : 
              activeTab === 'lots' ? 'lot' : 'bags'
            )}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTabData.bgColor} ${activeTabData.color} hover:opacity-80 transition-opacity font-medium text-sm`}
          >
            <Activity className="h-4 w-4" />
            View Ledger
          </button>
        </div>
      )}

      {/* Tab Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {activeTab === 'finished' && <FinishedGoodsTable onViewAudit={(id) => openAuditModal('finished_goods')} />}
          {activeTab === 'packets' && <PacketsTable onViewAudit={(id) => openAuditModal('packets')} />}
          {activeTab === 'lots' && <LotsTable onViewAudit={(id) => openAuditModal('lot')} />}
          {activeTab === 'bags' && <BagsTable onViewAudit={(type, capacity) => openAuditModal('bags')} />}
        </div>
      )}

      {/* Audit Modal */}
      <InventoryAuditModal
        open={auditModalOpen}
        onOpenChange={setAuditModalOpen}
        title={auditModalTitle}
        subtitle={auditModalSubtitle}
        auditType={auditType}
        data={auditData}
        loading={auditLoading}
      />
    </div>
  );
}
