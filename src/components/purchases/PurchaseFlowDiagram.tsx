import { ChevronRight, Package, FileText, ShoppingCart, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Sauda, InwardSlipPass, Purchase, PaymentAdvice } from '../../types/entities';

interface PurchaseFlowDiagramProps {
  sauda?: Sauda | null;
  inwardSlipPasses?: InwardSlipPass[];
  purchases?: Purchase[];
  paymentAdvices?: PaymentAdvice[];
  showLabels?: boolean;
}

export function PurchaseFlowDiagram({
  sauda,
  inwardSlipPasses = [],
  purchases = [],
  paymentAdvices = [],
  showLabels = true,
}: PurchaseFlowDiagramProps) {
  const navigate = useNavigate();

  const FlowStep = ({
    icon: Icon,
    title,
    subtitle,
    details,
    borderColor,
    bgColor,
    textColor,
    onClick,
    isActive,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    details?: string;
    borderColor: string;
    bgColor: string;
    textColor: string;
    onClick?: () => void;
    isActive: boolean;
  }) => (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <div
        className={`w-full glass rounded-lg p-3 border-2 transition-all ${
          isActive
            ? `${borderColor} ${bgColor} cursor-pointer hover:scale-105 shadow-md`
            : 'border-border opacity-40'
        }`}
        onClick={onClick}
      >
        <div className="flex flex-col items-center text-center space-y-1">
          <div className={`p-2 rounded-lg ${isActive ? bgColor : 'bg-muted'}`}>
            <Icon className={`h-5 w-5 ${isActive ? textColor : 'text-muted-foreground'}`} />
          </div>
          <p className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
            {title}
          </p>
          {subtitle && (
            <p className={`text-xs truncate w-full ${isActive ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
              {subtitle}
            </p>
          )}
          {details && (
            <p className={`text-xs ${isActive ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
              {details}
            </p>
          )}
        </div>
      </div>
      {isActive && (
        <div className="mt-2 text-center">
          <p className="text-xs font-semibold text-primary">
            {title === 'Sauda' && sauda && '✓ Created'}
            {title === 'Inward Slip' && inwardSlipPasses.length > 0 && '✓ Created'}
            {title === 'Purchase' && purchases.length > 0 && '✓ Created'}
            {title === 'Payment' && paymentAdvices.length > 0 && '✓ Created'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="glass rounded-xl p-4 sm:p-6">
      {showLabels && (
        <h2 className="text-lg font-semibold mb-4">Purchase Flow</h2>
      )}
      
      {/* Pipeline Flow */}
      <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-4">
        {/* Sauda Step */}
        <FlowStep
          icon={FileText}
          title="Sauda"
          subtitle={sauda?.rice_quality}
          borderColor="border-primary"
          bgColor="bg-primary/10"
          textColor="text-primary"
          isActive={!!sauda}
          onClick={sauda ? () => navigate(`/purchases/saudas/${sauda.id}`) : undefined}
        />

        {/* Connector */}
        <div className="flex-shrink-0 flex items-center">
          <div className={`h-0.5 w-8 sm:w-12 ${sauda ? 'bg-primary' : 'bg-border'}`} />
          <ChevronRight className={`h-4 w-4 ${sauda ? 'text-primary' : 'text-border'}`} />
          <div className={`h-0.5 w-8 sm:w-12 ${sauda && inwardSlipPasses.length > 0 ? 'bg-primary' : 'bg-border'}`} />
        </div>

        {/* Inward Slip Step */}
        <FlowStep
          icon={Package}
          title="Inward Slip"
          subtitle={inwardSlipPasses.length > 0 ? inwardSlipPasses[0].slip_number : undefined}
          details={
            inwardSlipPasses.length > 0
              ? `${inwardSlipPasses.length} ${inwardSlipPasses.length === 1 ? 'slip' : 'slips'}`
              : undefined
          }
          borderColor="border-blue-500"
          bgColor="bg-blue-500/10"
          textColor="text-blue-600"
          isActive={inwardSlipPasses.length > 0}
          onClick={
            inwardSlipPasses.length > 0
              ? () => navigate(`/purchases/inward-slips/${inwardSlipPasses[0].id}`)
              : undefined
          }
        />

        {/* Connector */}
        <div className="flex-shrink-0 flex items-center">
          <div
            className={`h-0.5 w-8 sm:w-12 ${
              inwardSlipPasses.length > 0 && purchases.length > 0 ? 'bg-blue-500' : 'bg-border'
            }`}
          />
          <ChevronRight
            className={`h-4 w-4 ${
              inwardSlipPasses.length > 0 && purchases.length > 0 ? 'text-blue-500' : 'text-border'
            }`}
          />
          <div
            className={`h-0.5 w-8 sm:w-12 ${
              purchases.length > 0 ? 'bg-green-500' : 'bg-border'
            }`}
          />
        </div>

        {/* Purchase Step */}
        <FlowStep
          icon={ShoppingCart}
          title="Purchase"
          subtitle={purchases.length > 0 ? purchases[0].invoice_number || `#${purchases[0].id.slice(0, 8)}` : undefined}
          details={
            purchases.length > 0 && purchases[0].total_amount
              ? `₹${purchases[0].total_amount.toLocaleString('en-IN')}`
              : undefined
          }
          borderColor="border-green-500"
          bgColor="bg-green-500/10"
          textColor="text-green-600"
          isActive={purchases.length > 0}
          onClick={purchases.length > 0 ? () => navigate(`/purchases/${purchases[0].id}`) : undefined}
        />

        {/* Connector */}
        <div className="flex-shrink-0 flex items-center">
          <div
            className={`h-0.5 w-8 sm:w-12 ${
              purchases.length > 0 && paymentAdvices.length > 0 ? 'bg-green-500' : 'bg-border'
            }`}
          />
          <ChevronRight
            className={`h-4 w-4 ${
              purchases.length > 0 && paymentAdvices.length > 0 ? 'text-green-500' : 'text-border'
            }`}
          />
          <div
            className={`h-0.5 w-8 sm:w-12 ${
              paymentAdvices.length > 0 ? 'bg-orange-500' : 'bg-border'
            }`}
          />
        </div>

        {/* Payment Step */}
        <FlowStep
          icon={DollarSign}
          title="Payment"
          subtitle={
            paymentAdvices.length > 0
              ? paymentAdvices[0].sr_number ||
                paymentAdvices[0].invoice_number ||
                `#${paymentAdvices[0].id.slice(0, 8)}`
              : undefined
          }
          details={
            paymentAdvices.length > 0
              ? `₹${paymentAdvices[0].net_payable.toLocaleString('en-IN')}`
              : undefined
          }
          borderColor="border-orange-500"
          bgColor="bg-orange-500/10"
          textColor="text-orange-600"
          isActive={paymentAdvices.length > 0}
          onClick={
            paymentAdvices.length > 0 ? () => navigate(`/purchases/payments/${paymentAdvices[0].id}`) : undefined
          }
        />
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-border/40">
        <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center text-xs">
          <div>
            <p className="text-muted-foreground mb-1">Sauda</p>
            <p className={`font-semibold ${sauda ? 'text-primary' : 'text-muted-foreground'}`}>
              {sauda ? '✓' : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Inward Slips</p>
            <p className={`font-semibold ${inwardSlipPasses.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
              {inwardSlipPasses.length > 0 ? '✓' : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Purchases</p>
            <p className={`font-semibold ${purchases.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
              {purchases.length > 0 ? '✓' : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Payments</p>
            <p className={`font-semibold ${paymentAdvices.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
              {paymentAdvices.length > 0 ? '✓' : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

