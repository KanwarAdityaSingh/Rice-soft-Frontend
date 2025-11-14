import { inwardSlipPassesAPI } from '../services/inwardSlipPasses.api';
import { purchasesAPI } from '../services/purchases.api';
import { paymentAdvicesAPI } from '../services/paymentAdvices.api';

export type FlowStep = 'transporter' | 'sauda' | 'inwardSlip' | 'purchase' | 'payment';

export interface FlowState {
  currentStep: FlowStep;
  completedSteps: FlowStep[];
  nextStep: FlowStep | null;
  hasInwardSlip: boolean;
  hasPurchase: boolean;
  hasPaymentAdvice: boolean;
}

/**
 * Detects the current flow state for a sauda
 */
export async function detectFlowStateForSauda(saudaId: string): Promise<FlowState> {
  const completedSteps: FlowStep[] = ['sauda'];
  let currentStep: FlowStep = 'inwardSlip';
  let nextStep: FlowStep | null = 'inwardSlip';
  let hasInwardSlip = false;
  let hasPurchase = false;
  let hasPaymentAdvice = false;

  try {
    // Check for inward slip
    const inwardSlips = await inwardSlipPassesAPI.getAllInwardSlipPasses(saudaId);
    if (inwardSlips.length > 0) {
      hasInwardSlip = true;
      completedSteps.push('inwardSlip');
      currentStep = 'purchase';
      nextStep = 'purchase';

      // Check for purchase
      const purchases = await purchasesAPI.getAllPurchases({ sauda_id: saudaId });
      if (purchases.length > 0) {
        hasPurchase = true;
        completedSteps.push('purchase');
        currentStep = 'payment';
        nextStep = 'payment';

        // Check for payment advice for the first purchase
        const paymentAdvices = await paymentAdvicesAPI.getAllPaymentAdvices({
          purchase_id: purchases[0].id,
        });
        if (paymentAdvices.length > 0) {
          hasPaymentAdvice = true;
          completedSteps.push('payment');
          nextStep = null; // Flow complete
        }
      }
    }
  } catch (error) {
    console.error('Error detecting flow state:', error);
  }

  return {
    currentStep,
    completedSteps,
    nextStep,
    hasInwardSlip,
    hasPurchase,
    hasPaymentAdvice,
  };
}

/**
 * Gets the next step for a sauda based on its flow state
 */
export async function getNextStepForSauda(saudaId: string): Promise<FlowStep | null> {
  const state = await detectFlowStateForSauda(saudaId);
  return state.nextStep;
}

/**
 * Gets the next step for an inward slip
 */
export async function getNextStepForInwardSlip(inwardSlipId: string): Promise<FlowStep | null> {
  try {
    const inwardSlip = await inwardSlipPassesAPI.getInwardSlipPassById(inwardSlipId);
    const saudaId = inwardSlip.sauda_id;

    // Check for purchase
    const purchases = await purchasesAPI.getAllPurchases({ sauda_id: saudaId });
    if (purchases.length === 0) {
      return 'purchase';
    }

    // Check for payment advice
    const paymentAdvices = await paymentAdvicesAPI.getAllPaymentAdvices({
      purchase_id: purchases[0].id,
    });
    if (paymentAdvices.length === 0) {
      return 'payment';
    }

    return null; // Flow complete
  } catch (error) {
    console.error('Error getting next step for inward slip:', error);
    return null;
  }
}

/**
 * Gets the next step for a purchase
 */
export async function getNextStepForPurchase(purchaseId: string): Promise<FlowStep | null> {
  try {
    const paymentAdvices = await paymentAdvicesAPI.getAllPaymentAdvices({
      purchase_id: purchaseId,
    });
    if (paymentAdvices.length === 0) {
      return 'payment';
    }
    return null; // Flow complete
  } catch (error) {
    console.error('Error getting next step for purchase:', error);
    return null;
  }
}

/**
 * Checks if an entity exists for a parent
 */
export async function checkEntityExists(
  type: 'inwardSlip' | 'purchase' | 'paymentAdvice',
  parentId: string
): Promise<boolean> {
  try {
    switch (type) {
      case 'inwardSlip': {
        const slips = await inwardSlipPassesAPI.getAllInwardSlipPasses(parentId);
        return slips.length > 0;
      }
      case 'purchase': {
        const purchases = await purchasesAPI.getAllPurchases({ sauda_id: parentId });
        return purchases.length > 0;
      }
      case 'paymentAdvice': {
        const payments = await paymentAdvicesAPI.getAllPaymentAdvices({ purchase_id: parentId });
        return payments.length > 0;
      }
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error checking if ${type} exists:`, error);
    return false;
  }
}

/**
 * Gets the wizard step number from a FlowStep
 */
export function getStepNumber(step: FlowStep): number {
  const stepMap: Record<FlowStep, number> = {
    transporter: 1,
    sauda: 2,
    inwardSlip: 3,
    purchase: 4,
    payment: 5,
  };
  return stepMap[step];
}

/**
 * Gets the FlowStep from a step number
 */
export function getStepFromNumber(stepNumber: number): FlowStep {
  const stepMap: Record<number, FlowStep> = {
    1: 'transporter',
    2: 'sauda',
    3: 'inwardSlip',
    4: 'purchase',
    5: 'payment',
  };
  return stepMap[stepNumber] || 'transporter';
}

