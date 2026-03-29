import { useState } from 'react';
import { TrendingUp, Warehouse } from 'lucide-react';
import { InventoryDashboard } from '../../components/production/inventory/InventoryDashboard';
import { LotsTable } from '../../components/production/inventory/LotsTable';
import { GodownFilterSelect } from '../../components/shared/GodownFilterSelect';

type InventoryMainTab = 'hierarchy' | 'lots';

export default function InventoryPage() {
  const [mainTab, setMainTab] = useState<InventoryMainTab>('hierarchy');
  const [godownFilter, setGodownFilter] = useState<string | undefined>();

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      <header className="hero-bg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            <span className="text-gradient">Inventory</span>
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
            Finished goods hierarchy, or bulk purchase stock (lots) held in godowns before packing
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMainTab('hierarchy')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mainTab === 'hierarchy'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Hierarchy
          </button>
          <button
            type="button"
            onClick={() => setMainTab('lots')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mainTab === 'lots'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Warehouse className="h-4 w-4" />
            Lot stock (raw)
          </button>
        </div>
        <GodownFilterSelect value={godownFilter} onChange={setGodownFilter} label="Godown" />
      </div>

      {mainTab === 'hierarchy' ? (
        <InventoryDashboard godownFilter={godownFilter} />
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <LotsTable godownId={godownFilter} />
        </div>
      )}
    </div>
  );
}

