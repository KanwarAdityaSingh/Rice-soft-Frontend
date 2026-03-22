import { Warehouse } from 'lucide-react';
import { GodownsTable } from '../../components/admin/godowns/GodownsTable';

export default function GodownsPage() {
  return (
    <div className="container mx-auto py-6 sm:py-10 space-y-6 sm:space-y-8 px-4 sm:px-6">
      <header className="hero-bg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -left-6 -top-6 h-24 w-24 floating-orb" />
        <div className="absolute -right-6 -bottom-6 h-20 w-20 floating-orb" />
        <div className="relative flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Warehouse className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              <span className="text-gradient">Godowns</span>
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
              Warehouses — master data for receiving stock, production batches, and dispatch fulfillment
            </p>
          </div>
        </div>
      </header>

      <GodownsTable />
    </div>
  );
}
