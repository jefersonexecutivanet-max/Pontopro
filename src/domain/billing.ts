export const BILLING_PLANS = {
  prata: { id: 'prata', name: 'Prata', priceCents: 14990, maxEmployees: 100 },
  ouro: { id: 'ouro', name: 'Ouro', priceCents: 39990, maxEmployees: 500 },
  diamante: { id: 'diamante', name: 'Diamante', priceCents: 69990, maxEmployees: 1000 },
} as const;

export type BillingPlanId = keyof typeof BILLING_PLANS;
export type BillingStatus = 'pending' | 'active' | 'past_due' | 'canceling' | 'canceled' | 'inactive';

export function normalizeBillingPlan(value: unknown): BillingPlanId | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'prata') return 'prata';
  if (normalized === 'ouro') return 'ouro';
  if (normalized === 'diamante') return 'diamante';
  return null;
}

export function resolveBillingStatus(current: BillingStatus, eventName: string, paymentStatus: string, subscriptionStatus: string): BillingStatus {
  if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(eventName) || ['CONFIRMED', 'RECEIVED'].includes(paymentStatus)) return 'active';
  if (eventName === 'PAYMENT_OVERDUE' || paymentStatus === 'OVERDUE') return 'past_due';
  if (eventName === 'SUBSCRIPTION_INACTIVATED' || eventName === 'SUBSCRIPTION_DELETED' || subscriptionStatus === 'INACTIVE') return 'canceled';
  return current;
}

export function canAddEmployee(activeEmployeeCount: number, planId: BillingPlanId): boolean {
  return Number.isInteger(activeEmployeeCount) && activeEmployeeCount >= 0 && activeEmployeeCount < BILLING_PLANS[planId].maxEmployees;
}
