import { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle2, Truck, FileText, ShoppingCart, Package, DollarSign, Sparkles, Eye, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TransporterFormModal } from './TransporterFormModal';
import { SaudaFormModal } from './SaudaFormModal';
import { InwardSlipFormModal } from './InwardSlipFormModal';
import { PurchaseFormModal } from './PurchaseFormModal';
import { PaymentAdviceFormModal } from './PaymentAdviceFormModal';
import { useTransporters } from '../../hooks/useTransporters';
import { CustomSelect } from '../shared/CustomSelect';
import { AlertDialog } from '../shared/AlertDialog';
import { detectFlowStateForSauda, getStepNumber, type FlowState } from '../../utils/purchaseFlow';
import { inwardSlipPassesAPI } from '../../services/inwardSlipPasses.api';
import { purchasesAPI } from '../../services/purchases.api';
import { paymentAdvicesAPI } from '../../services/paymentAdvices.api';
import { saudasAPI } from '../../services/saudas.api';
import type { Sauda, InwardSlipPass, Purchase, PaymentAdvice } from '../../types/entities';

interface PurchaseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSaudaId?: string | null;
  initialInwardSlipId?: string | null;
  initialPurchaseId?: string | null;
}

export function PurchaseWizard({ open, onOpenChange, initialSaudaId, initialInwardSlipId, initialPurchaseId }: PurchaseWizardProps) {
  const navigate = useNavigate();
  const { transporters } = useTransporters();

  const [step, setStep] = useState(1);
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  const [selectedSaudaId, setSelectedSaudaId] = useState<string | null>(initialSaudaId || null);
  const [selectedInwardSlipId, setSelectedInwardSlipId] = useState<string | null>(initialInwardSlipId || null);
  // selectedInwardSlipId is used in modals and entity loading
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(initialPurchaseId || null);
  const [transporterModalOpen, setTransporterModalOpen] = useState(false);
  const [saudaModalOpen, setSaudaModalOpen] = useState(false);
  const [inwardSlipModalOpen, setInwardSlipModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [paymentAdviceModalOpen, setPaymentAdviceModalOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  
  // Existing entities state
  const [existingSauda, setExistingSauda] = useState<Sauda | null>(null);
  const [existingInwardSlip, setExistingInwardSlip] = useState<InwardSlipPass | null>(null);
  const [existingPurchase, setExistingPurchase] = useState<Purchase | null>(null);
  const [existingPaymentAdvice, setExistingPaymentAdvice] = useState<PaymentAdvice | null>(null);
  const [flowState, setFlowState] = useState<FlowState | null>(null);
  const [loadingFlowState, setLoadingFlowState] = useState(false);
  // loadingFlowState could be used for loading indicators in the future

  const steps = [
    { number: 1, title: 'Transporter', description: 'Select or create transporter (optional)', icon: Truck },
    { number: 2, title: 'Sauda', description: 'Create purchase agreement', icon: FileText },
    { number: 3, title: 'Inward Slip', description: 'Create inward slip pass with lots', icon: Package },
    { number: 4, title: 'Purchase', description: 'Create purchase transaction', icon: ShoppingCart },
    { number: 5, title: 'Payment', description: 'Create payment advice', icon: DollarSign },
  ];

  // Load entities when step changes to ensure they're available for preview
  useEffect(() => {
    if (!open) return;

    const loadEntitiesForStep = async () => {
      try {
        // Always reload entities when navigating to ensure fresh data
        if (selectedSaudaId) {
          // Load sauda if on step 2 or later
          if (step >= 2) {
            const sauda = await saudasAPI.getSaudaById(selectedSaudaId);
            setExistingSauda(sauda);
          }

          // Load inward slip if on step 3 or later
          if (step >= 3) {
            const slips = await inwardSlipPassesAPI.getAllInwardSlipPasses(selectedSaudaId);
            if (slips.length > 0) {
              setExistingInwardSlip(slips[0]);
              setSelectedInwardSlipId(slips[0].id);
            } else {
              setExistingInwardSlip(null);
            }
          }

          // Load purchase if on step 4 or later
          if (step >= 4) {
            const purchases = await purchasesAPI.getAllPurchases({ sauda_id: selectedSaudaId });
            if (purchases.length > 0) {
              const purchase = purchases[0];
              setExistingPurchase(purchase);
              setSelectedPurchaseId(purchase.id);
              
              // Load payment advice if on step 5
              if (step >= 5) {
                const payments = await paymentAdvicesAPI.getAllPaymentAdvices({ purchase_id: purchase.id });
                if (payments.length > 0) {
                  setExistingPaymentAdvice(payments[0]);
                } else {
                  setExistingPaymentAdvice(null);
                }
              }
            } else {
              setExistingPurchase(null);
              setSelectedPurchaseId(null);
            }
          }
        }
      } catch (error) {
        console.error('Error loading entities for step:', error);
      }
    };

    loadEntitiesForStep();
  }, [step, open, selectedSaudaId]);

  // Load existing entities and detect flow state when wizard opens
  useEffect(() => {
    if (!open) return;

    const loadExistingEntities = async () => {
      setLoadingFlowState(true);
      try {
        // Load sauda if ID provided
        if (initialSaudaId) {
          const sauda = await saudasAPI.getSaudaById(initialSaudaId);
          setExistingSauda(sauda);
          setSelectedSaudaId(initialSaudaId);
          
          // Detect flow state
          const state = await detectFlowStateForSauda(initialSaudaId);
          setFlowState(state);
          
          // Set step based on flow state
          const stepNum = getStepNumber(state.currentStep);
          setStep(stepNum);
          
          // Load existing entities
          if (state.hasInwardSlip) {
            const slips = await inwardSlipPassesAPI.getAllInwardSlipPasses(initialSaudaId);
            if (slips.length > 0) {
              setExistingInwardSlip(slips[0]);
              setSelectedInwardSlipId(slips[0].id);
            }
          }
          
          if (state.hasPurchase) {
            const purchases = await purchasesAPI.getAllPurchases({ sauda_id: initialSaudaId });
            if (purchases.length > 0) {
              setExistingPurchase(purchases[0]);
              setSelectedPurchaseId(purchases[0].id);
              
              // Load payment advice if exists
              if (state.hasPaymentAdvice) {
                const payments = await paymentAdvicesAPI.getAllPaymentAdvices({ purchase_id: purchases[0].id });
                if (payments.length > 0) {
                  setExistingPaymentAdvice(payments[0]);
                }
              }
            }
          }
        } else if (initialInwardSlipId) {
          const slip = await inwardSlipPassesAPI.getInwardSlipPassById(initialInwardSlipId);
          setExistingInwardSlip(slip);
          setSelectedInwardSlipId(initialInwardSlipId);
          setSelectedSaudaId(slip.sauda_id);
          
          const sauda = await saudasAPI.getSaudaById(slip.sauda_id);
          setExistingSauda(sauda);
          
          const state = await detectFlowStateForSauda(slip.sauda_id);
          setFlowState(state);
          const stepNum = getStepNumber(state.currentStep);
          setStep(stepNum);
        } else if (initialPurchaseId) {
          const purchase = await purchasesAPI.getPurchaseById(initialPurchaseId);
          setExistingPurchase(purchase);
          setSelectedPurchaseId(initialPurchaseId);
          setSelectedSaudaId(purchase.sauda_id);
          
          const sauda = await saudasAPI.getSaudaById(purchase.sauda_id);
          setExistingSauda(sauda);
          
          const slips = await inwardSlipPassesAPI.getAllInwardSlipPasses(purchase.sauda_id);
          if (slips.length > 0) {
            setExistingInwardSlip(slips[0]);
            setSelectedInwardSlipId(slips[0].id);
          }
          
          const state = await detectFlowStateForSauda(purchase.sauda_id);
          setFlowState(state);
          const stepNum = getStepNumber(state.currentStep);
          setStep(stepNum);
        }
      } catch (error) {
        console.error('Error loading existing entities:', error);
      } finally {
        setLoadingFlowState(false);
      }
    };

    loadExistingEntities();
  }, [open, initialSaudaId, initialInwardSlipId, initialPurchaseId]);

  const handleTransporterCreated = () => {
    setTransporterModalOpen(false);
    // Refresh transporters list
    window.location.reload(); // Simple refresh for now
  };

  const handleInwardSlipCreated = (inwardSlipId?: string) => {
    setInwardSlipModalOpen(false);
    if (inwardSlipId) {
      setSelectedInwardSlipId(inwardSlipId);
    }
    setStep(4); // Move to Purchase step
  };


  const resetWizard = () => {
    setStep(1);
    setSelectedTransporterId(null);
    setSelectedSaudaId(null);
    setSelectedInwardSlipId(null);
    setSelectedPurchaseId(null);
    setExistingSauda(null);
    setExistingInwardSlip(null);
    setExistingPurchase(null);
    setExistingPaymentAdvice(null);
    setFlowState(null);
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  // Entity Preview Card Component
  const EntityPreviewCard = ({ 
    title, 
    entity, 
    onView, 
    onEdit 
  }: { 
    title: string; 
    entity: Sauda | InwardSlipPass | Purchase | PaymentAdvice | null; 
    onView?: () => void;
    onEdit?: () => void;
  }) => {
    if (!entity) return null;

    return (
      <div className="mt-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {title} Created
            </p>
            {'rice_quality' in entity && (
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Quality:</span> {entity.rice_quality}</p>
                <p><span className="font-medium">Rate:</span> ₹{entity.rate}/kg</p>
                <p><span className="font-medium">Quantity:</span> {entity.quantity.toLocaleString('en-IN')} kg</p>
              </div>
            )}
            {'slip_number' in entity && (
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Slip Number:</span> {entity.slip_number}</p>
                <p><span className="font-medium">Vehicle:</span> {entity.vehicle_number}</p>
                <p><span className="font-medium">Lots:</span> {entity.lots.length}</p>
              </div>
            )}
            {'invoice_number' in entity && 'total_amount' in entity && (
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Invoice:</span> {entity.invoice_number || `#${entity.id.slice(0, 8)}`}</p>
                {entity.total_amount && (
                  <p><span className="font-medium">Amount:</span> ₹{entity.total_amount.toLocaleString('en-IN')}</p>
                )}
              </div>
            )}
            {'sr_number' in entity && (
              <div className="text-sm space-y-1">
                <p><span className="font-medium">SR Number:</span> {entity.sr_number || entity.invoice_number || `#${entity.id.slice(0, 8)}`}</p>
                <p><span className="font-medium">Net Payable:</span> ₹{entity.net_payable.toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 ml-4">
            {onView && (
              <button
                onClick={onView}
                className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
              >
                <Eye className="h-3 w-3" />
                View
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
              >
                <Edit className="h-3 w-3" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div 
          className={`fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleClose} 
        />
        <div 
          className={`relative glass rounded-3xl p-8 shadow-2xl max-w-5xl w-full mx-4 max-h-[92vh] overflow-y-auto transform transition-all duration-300 ${
            open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  New Purchase Flow
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Complete all steps to create a purchase</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="rounded-xl p-2 hover:bg-muted/50 transition-all duration-200 hover:scale-110"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Enhanced Progress Steps */}
          <div className="mb-10">
            <div className="relative">
              {/* Background connector line */}
              <div className="absolute top-7 left-[7%] right-[7%] h-0.5 bg-border" />
              
              {/* Progress connector line */}
              <div 
                className="absolute top-7 left-[7%] h-0.5 bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{
                  width: step > 1 ? `${((step - 1) / (steps.length - 1)) * 86}%` : '0%',
                }}
              />
              
              <div className="flex items-start justify-between relative">
                {steps.map((s) => {
                  const Icon = s.icon;
                  // Determine if step is completed based on flowState or step number
                  let isCompleted = false;
                  if (flowState) {
                    if (s.number === 2) isCompleted = !!existingSauda;
                    else if (s.number === 3) isCompleted = flowState.hasInwardSlip;
                    else if (s.number === 4) isCompleted = flowState.hasPurchase;
                    else if (s.number === 5) isCompleted = flowState.hasPaymentAdvice;
                    else if (s.number === 1) isCompleted = step > 1; // Transporter is optional
                  } else {
                    isCompleted = step > s.number;
                  }
                  const isActive = step === s.number;
                  
                  // Determine if step can be clicked (completed steps or steps with entities)
                  const canClick = isCompleted || 
                    (s.number === 2 && existingSauda) ||
                    (s.number === 3 && existingInwardSlip) ||
                    (s.number === 4 && existingPurchase) ||
                    (s.number === 5 && existingPaymentAdvice);
                  
                  const handleStepClick = () => {
                    if (canClick || s.number < step) {
                      setStep(s.number);
                    }
                  };

                  return (
                    <div key={s.number} className="flex flex-col items-center flex-1 relative z-10">
                      {/* Step Circle */}
                      <div className="relative">
                        <div
                          onClick={handleStepClick}
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 relative z-20 bg-background ${
                            isCompleted
                              ? 'bg-gradient-to-br from-primary to-accent border-primary text-white shadow-lg shadow-primary/30 cursor-pointer hover:scale-110'
                              : isActive
                              ? 'bg-gradient-to-br from-primary/20 to-accent/20 border-primary text-primary shadow-md shadow-primary/20 scale-110'
                              : canClick || s.number < step
                              ? 'bg-muted/50 border-border text-muted-foreground cursor-pointer hover:bg-muted hover:scale-105'
                              : 'bg-muted/50 border-border text-muted-foreground'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-6 w-6" />
                          ) : (
                            <Icon className={`h-6 w-6 ${isActive ? 'text-primary' : ''}`} />
                          )}
                        </div>
                        {/* Active step pulse effect */}
                        {isActive && (
                          <div className="absolute inset-0 rounded-2xl bg-primary/30 animate-ping z-10" />
                        )}
                      </div>
                      
                      {/* Step Info */}
                      <div className="mt-3 text-center w-full">
                        <p 
                          onClick={handleStepClick}
                          className={`text-sm font-semibold transition-colors ${
                            isActive ? 'text-primary' : isCompleted ? 'text-foreground' : canClick || s.number < step ? 'text-foreground cursor-pointer hover:text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          {s.title}
                        </p>
                        <p className={`text-xs mt-1 transition-colors hidden md:block ${
                          isActive ? 'text-muted-foreground' : 'text-muted-foreground/70'
                        }`}>
                          {s.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="space-y-6">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">Step 1: Transporter (Optional)</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Select an existing transporter or create a new one. This step is optional but required for
                        xgodown type saudas.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block text-foreground">
                        Select Transporter
                      </label>
                      <CustomSelect
                        value={selectedTransporterId}
                        onChange={(value) => setSelectedTransporterId(value)}
                        options={transporters.map((t) => ({ value: t.id, label: t.business_name }))}
                        placeholder="Select transporter or create new"
                        allowClear
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setTransporterModalOpen(true)}
                        className="btn-secondary flex-1 py-3 text-sm font-semibold"
                      >
                        <Truck className="h-4 w-4 inline mr-2" />
                        Create New Transporter
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold"
                      >
                        Next: Sauda <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">Step 2: Create Sauda</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Create a purchase agreement (Sauda). This defines the terms of the purchase.
                      </p>
                    </div>
                  </div>

                  <EntityPreviewCard
                    title="Sauda"
                    entity={existingSauda}
                    onView={existingSauda ? () => {
                      onOpenChange(false);
                      setTimeout(() => navigate(`/purchases/saudas/${existingSauda.id}`), 100);
                    } : undefined}
                    onEdit={existingSauda ? () => {
                      setSaudaModalOpen(true);
                    } : undefined}
                  />

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="btn-secondary flex items-center justify-center gap-2 py-3 px-6 text-sm font-semibold"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    {!existingSauda && (
                      <button
                        type="button"
                        onClick={() => setSaudaModalOpen(true)}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold"
                      >
                        <FileText className="h-4 w-4" />
                        Create Sauda
                      </button>
                    )}
                    {existingSauda && (
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold"
                      >
                        Continue to Inward Slip <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {selectedSaudaId && !existingSauda && (
                    <div className="mt-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
                      <p className="text-sm font-semibold text-primary flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Sauda created successfully! Click continue to proceed.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && selectedSaudaId && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">Step 3: Create Inward Slip Pass</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Create an inward slip pass with multiple lots. Each lot will be automatically calculated.
                      </p>
                      {flowState?.hasInwardSlip && (
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2 font-medium">
                          Note: Only one inward slip can be created per sauda. An inward slip already exists.
                        </p>
                      )}
                    </div>
                  </div>

                  <EntityPreviewCard
                    title="Inward Slip"
                    entity={existingInwardSlip}
                    onView={existingInwardSlip ? () => {
                      onOpenChange(false);
                      setTimeout(() => navigate(`/purchases/inward-slips/${existingInwardSlip.id}`), 100);
                    } : undefined}
                    onEdit={existingInwardSlip ? () => {
                      setInwardSlipModalOpen(true);
                    } : undefined}
                  />

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="btn-secondary flex items-center justify-center gap-2 py-3 px-6 text-sm font-semibold"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    {!flowState?.hasInwardSlip && (
                      <button
                        type="button"
                        onClick={() => setInwardSlipModalOpen(true)}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold"
                      >
                        <Package className="h-4 w-4" />
                        Create Inward Slip Pass
                      </button>
                    )}
                    {flowState?.hasInwardSlip && (
                      <button
                        type="button"
                        onClick={() => setStep(4)}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold"
                      >
                        Continue to Purchase <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && selectedSaudaId && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                      <ShoppingCart className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">Step 4: Create Purchase</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Create the actual purchase transaction linked to the sauda. Amounts will be automatically calculated from inward slip lots.
                      </p>
                    </div>
                  </div>

                  <EntityPreviewCard
                    title="Purchase"
                    entity={existingPurchase}
                    onView={existingPurchase ? () => {
                      onOpenChange(false);
                      setTimeout(() => navigate(`/purchases/${existingPurchase.id}`), 100);
                    } : undefined}
                    onEdit={existingPurchase ? () => {
                      setPurchaseModalOpen(true);
                    } : undefined}
                  />

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="btn-secondary flex items-center justify-center gap-2 py-3 px-6 text-sm font-semibold"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    {!flowState?.hasPurchase && (
                      <button
                        type="button"
                        onClick={() => setPurchaseModalOpen(true)}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Create Purchase
                      </button>
                    )}
                    {flowState?.hasPurchase && (
                      <button
                        type="button"
                        onClick={() => setStep(5)}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold"
                      >
                        Continue to Payment <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && selectedPurchaseId && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">Step 5: Create Payment Advice</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Create payment advice with charges. Net payable will be calculated automatically.
                      </p>
                      {flowState?.hasPaymentAdvice && (
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2 font-medium">
                          Note: Only one payment advice can be created per purchase. A payment advice already exists.
                        </p>
                      )}
                    </div>
                  </div>

                  <EntityPreviewCard
                    title="Payment Advice"
                    entity={existingPaymentAdvice}
                    onView={existingPaymentAdvice ? () => {
                      onOpenChange(false);
                      setTimeout(() => navigate(`/purchases/payments/${existingPaymentAdvice.id}`), 100);
                    } : undefined}
                    onEdit={existingPaymentAdvice ? () => {
                      setPaymentAdviceModalOpen(true);
                    } : undefined}
                  />

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="btn-secondary flex items-center justify-center gap-2 py-3 px-6 text-sm font-semibold"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    {!flowState?.hasPaymentAdvice && (
                      <button
                        type="button"
                        onClick={() => setPaymentAdviceModalOpen(true)}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold"
                      >
                        <DollarSign className="h-4 w-4" />
                        Create Payment Advice
                      </button>
                    )}
                    {flowState?.hasPaymentAdvice && (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm font-semibold text-primary">Flow Complete!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <TransporterFormModal
        open={transporterModalOpen}
        onOpenChange={(open) => {
          setTransporterModalOpen(open);
          if (!open) handleTransporterCreated();
        }}
      />

      <SaudaFormModal
        open={saudaModalOpen}
        onOpenChange={(open) => {
          setSaudaModalOpen(open);
          if (!open && existingSauda) {
            // Reload sauda if editing
            saudasAPI.getSaudaById(existingSauda.id).then(setExistingSauda).catch(console.error);
          }
        }}
        preselectedVendorId={null}
        preselectedTransporterId={selectedTransporterId}
        saudaId={existingSauda?.id || null}
        onSuccess={async (saudaId) => {
          const sauda = await saudasAPI.getSaudaById(saudaId);
          setExistingSauda(sauda);
          setSelectedSaudaId(saudaId);
          const state = await detectFlowStateForSauda(saudaId);
          setFlowState(state);
          setStep(3); // Now step 3 is Inward Slip
        }}
      />

      <InwardSlipFormModal
        open={inwardSlipModalOpen}
        onOpenChange={(open) => {
          setInwardSlipModalOpen(open);
          if (!open && existingInwardSlip && selectedSaudaId) {
            // Reload inward slip if editing
            inwardSlipPassesAPI.getAllInwardSlipPasses(selectedSaudaId).then((slips) => {
              if (slips.length > 0) setExistingInwardSlip(slips[0]);
            }).catch(console.error);
          }
        }}
        saudaId={selectedSaudaId || ''}
        inwardSlipId={existingInwardSlip?.id}
        onSuccess={async (inwardSlipId) => {
          if (inwardSlipId && selectedSaudaId) {
            const slip = await inwardSlipPassesAPI.getInwardSlipPassById(inwardSlipId);
            setExistingInwardSlip(slip);
            setSelectedInwardSlipId(inwardSlipId);
            const state = await detectFlowStateForSauda(selectedSaudaId);
            setFlowState(state);
          }
          handleInwardSlipCreated(inwardSlipId);
        }}
      />

      <PurchaseFormModal
        open={purchaseModalOpen}
        onOpenChange={(open) => {
          setPurchaseModalOpen(open);
          if (!open && existingPurchase) {
            // Reload purchase if editing
            purchasesAPI.getPurchaseById(existingPurchase.id).then(setExistingPurchase).catch(console.error);
          }
        }}
        preselectedSaudaId={selectedSaudaId}
        preselectedVendorId={null}
        purchaseId={existingPurchase?.id || null}
        onSuccess={async (purchaseId) => {
          const purchase = await purchasesAPI.getPurchaseById(purchaseId);
          setExistingPurchase(purchase);
          setSelectedPurchaseId(purchaseId);
          if (selectedSaudaId) {
            const state = await detectFlowStateForSauda(selectedSaudaId);
            setFlowState(state);
          }
          setStep(5); // Move to Payment step
        }}
      />

      <PaymentAdviceFormModal
        open={paymentAdviceModalOpen}
        onOpenChange={(open) => {
          setPaymentAdviceModalOpen(open);
          if (!open && existingPaymentAdvice) {
            // Reload payment advice if editing
            paymentAdvicesAPI.getPaymentAdviceById(existingPaymentAdvice.id).then(setExistingPaymentAdvice).catch(console.error);
          }
        }}
        preselectedPurchaseId={selectedPurchaseId}
        preselectedVendorId={null}
        paymentAdviceId={existingPaymentAdvice?.id || null}
        onSuccess={async () => {
          if (selectedPurchaseId) {
            const payments = await paymentAdvicesAPI.getAllPaymentAdvices({ purchase_id: selectedPurchaseId });
            if (payments.length > 0) {
              setExistingPaymentAdvice(payments[0]);
            }
            if (selectedSaudaId) {
              const state = await detectFlowStateForSauda(selectedSaudaId);
              setFlowState(state);
            }
          }
          setAlertType('success');
          setAlertTitle('Purchase Flow Complete');
          setAlertMessage('All steps completed successfully!');
          setAlertOpen(true);
          setTimeout(() => {
            onOpenChange(false);
            navigate('/purchases');
          }, 2000);
        }}
      />

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

