import test from 'node:test';
import assert from 'node:assert/strict';
import { BILLING_PLANS, canAddEmployee, normalizeBillingPlan, resolveBillingStatus } from './billing';

test('plans expose the agreed monthly prices and employee limits', () => {
  assert.deepEqual(
    Object.values(BILLING_PLANS).map(p => [p.id, p.priceCents, p.maxEmployees]),
    [['prata', 14990, 100], ['ouro', 39990, 500], ['diamante', 69990, 1000]],
  );
});

test('plan normalization accepts display names and rejects unknown plans', () => {
  assert.equal(normalizeBillingPlan('Prata'), 'prata');
  assert.equal(normalizeBillingPlan(' OURO '), 'ouro');
  assert.equal(normalizeBillingPlan('Diamante'), 'diamante');
  assert.equal(normalizeBillingPlan('gratuito'), null);
});

test('employee limit is enforced at the exact plan boundary', () => {
  assert.equal(canAddEmployee(99, 'prata'), true);
  assert.equal(canAddEmployee(100, 'prata'), false);
  assert.equal(canAddEmployee(499, 'ouro'), true);
  assert.equal(canAddEmployee(500, 'ouro'), false);
  assert.equal(canAddEmployee(1000, 'diamante'), false);
});

test('webhook events map payment, overdue and cancellation statuses', () => {
  assert.equal(resolveBillingStatus('pending', 'PAYMENT_RECEIVED', 'RECEIVED', ''), 'active');
  assert.equal(resolveBillingStatus('active', 'PAYMENT_OVERDUE', 'OVERDUE', ''), 'past_due');
  assert.equal(resolveBillingStatus('active', 'SUBSCRIPTION_INACTIVATED', '', 'INACTIVE'), 'canceled');
  assert.equal(resolveBillingStatus('pending', 'PAYMENT_CREATED', 'PENDING', ''), 'pending');
});
