import { useState } from 'react';
import { Plus } from 'lucide-react';
import { SaudasTable } from '../../components/purchases/saudas/SaudasTable';
import { SaudaFormModal } from '../../components/purchases/saudas/SaudaFormModal';

export default function SaudasPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      <header className="hero-bg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              <span className="text-gradient">Saudas</span>
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">Manage purchase agreements</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 px-4 py-2"
          >
            <Plus className="h-4 w-4" /> Add Sauda
          </button>
        </div>
      </header>

      <SaudasTable />

      <SaudaFormModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
        }}
      />
    </div>
  );
}

