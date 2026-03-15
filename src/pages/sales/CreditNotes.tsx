import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { CreditNotesTable } from '../../components/sales/credit-notes/CreditNotesTable';
import { CreditNoteFormModal } from '../../components/sales/credit-notes/CreditNoteFormModal';

export default function CreditNotesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const tableRefreshRef = useRef<(() => void) | null>(null);

  const handleSuccess = () => {
    tableRefreshRef.current?.();
  };

  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      <header className="hero-bg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              <span className="text-gradient">Credit Notes</span>
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
              Create and confirm returns against invoice dispatches
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary rounded-xl inline-flex items-center justify-center gap-2 px-4 py-2"
          >
            <Plus className="h-4 w-4" /> New Credit Note
          </button>
        </div>
      </header>

      <CreditNotesTable onRefreshRef={tableRefreshRef} />

      <CreditNoteFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
