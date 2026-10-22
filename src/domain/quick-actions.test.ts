import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUserApproveCorrections,
  getQuickActionsSummary,
  formatPendingCorrectionsSummary,
  validateBatchApproval,
  validateOfflineSync,
} from './quick-actions';
import { CorrectionRequest } from '../types';

test('canUserApproveCorrections allows managers and admins but denies employee/auditor', () => {
  assert.equal(canUserApproveCorrections('company_admin'), true);
  assert.equal(canUserApproveCorrections('manager'), true);
  assert.equal(canUserApproveCorrections('saas_owner'), true);
  assert.equal(canUserApproveCorrections('employee'), false);
  assert.equal(canUserApproveCorrections('auditor'), false);
  assert.equal(canUserApproveCorrections(null), false);
  assert.equal(canUserApproveCorrections(undefined), false);
});

test('getQuickActionsSummary correctly aggregates pending counters and texts', () => {
  // Case 1: Both pending
  const s1 = getQuickActionsSummary({
    pendingCorrectionsCount: 3,
    pendingOfflineCount: 2,
    isOnline: true,
    isSyncing: false,
  });
  assert.equal(s1.urgentCount, 5);
  assert.equal(s1.canSync, true);
  assert.equal(s1.needsAttention, true);
  assert.equal(s1.hasPendingCorrections, true);
  assert.equal(s1.hasPendingOffline, true);
  assert.equal(s1.statusText, '3 ajuste(s) e 2 offline');

  // Case 2: Zero pending, online
  const s2 = getQuickActionsSummary({
    pendingCorrectionsCount: 0,
    pendingOfflineCount: 0,
    isOnline: true,
    isSyncing: false,
  });
  assert.equal(s2.urgentCount, 0);
  assert.equal(s2.canSync, false);
  assert.equal(s2.needsAttention, false);
  assert.equal(s2.statusText, 'Tudo em dia');

  // Case 3: Offline pending but no connection
  const s3 = getQuickActionsSummary({
    pendingCorrectionsCount: 0,
    pendingOfflineCount: 4,
    isOnline: false,
    isSyncing: false,
  });
  assert.equal(s3.urgentCount, 4);
  assert.equal(s3.canSync, false);
  assert.equal(s3.statusText, '4 batida(s) offline');
});

test('formatPendingCorrectionsSummary identifies unique employees and oldest date', () => {
  const mockCorrections: CorrectionRequest[] = [
    {
      id: 'c1',
      company_id: 'comp1',
      employee_id: 'emp1',
      requested_date: '2026-10-18',
      requested_time: '08:00',
      requested_event_type: 'entry',
      reason: 'Atendimento médico',
      status: 'pending',
      created_at: '2026-10-18T09:00:00Z',
    },
    {
      id: 'c2',
      company_id: 'comp1',
      employee_id: 'emp1',
      requested_date: '2026-10-19',
      requested_time: '12:00',
      requested_event_type: 'lunch_start',
      reason: 'Sem leitor no refeitório',
      status: 'pending',
      created_at: '2026-10-19T13:00:00Z',
    },
    {
      id: 'c3',
      company_id: 'comp1',
      employee_id: 'emp2',
      requested_date: '2026-10-20',
      requested_time: '17:00',
      requested_event_type: 'exit',
      reason: 'Reunião cliente',
      status: 'pending',
      created_at: '2026-10-20T18:00:00Z',
    },
    {
      id: 'c4',
      company_id: 'comp1',
      employee_id: 'emp3',
      requested_date: '2026-10-15',
      requested_time: '08:00',
      requested_event_type: 'entry',
      reason: 'Já aprovada antes',
      status: 'approved',
      created_at: '2026-10-15T09:00:00Z',
    },
  ];

  const summary = formatPendingCorrectionsSummary(mockCorrections);
  assert.equal(summary.total, 3);
  assert.equal(summary.uniqueEmployees, 2);
  assert.equal(summary.oldestDate, '2026-10-18');
});

test('validateBatchApproval checks roles and pending lists', () => {
  const pendingCorr: CorrectionRequest[] = [
    {
      id: 'c1',
      company_id: 'comp1',
      employee_id: 'emp1',
      requested_date: '2026-10-21',
      requested_time: '08:00',
      requested_event_type: 'entry',
      reason: 'Esquecimento',
      status: 'pending',
      created_at: '2026-10-21T09:00:00Z',
    },
  ];

  // Employee cannot approve
  const resEmployee = validateBatchApproval(pendingCorr, 'employee');
  assert.equal(resEmployee.allowed, false);
  assert.equal(resEmployee.reason?.includes('restrita'), true);

  // Admin can approve
  const resAdmin = validateBatchApproval(pendingCorr, 'company_admin');
  assert.equal(resAdmin.allowed, true);
  assert.equal(resAdmin.count, 1);

  // Empty list cannot be approved
  const resEmpty = validateBatchApproval([], 'company_admin');
  assert.equal(resEmpty.allowed, false);
  assert.equal(resEmpty.reason?.includes('Nenhuma solicitação'), true);
});

test('validateOfflineSync enforces network and queue conditions', () => {
  // Can sync when queue > 0, online, not syncing
  assert.deepEqual(validateOfflineSync(5, true, false), { canSync: true });

  // Cannot sync if already syncing
  const resSyncing = validateOfflineSync(5, true, true);
  assert.equal(resSyncing.canSync, false);
  assert.equal(resSyncing.reason?.includes('em andamento'), true);

  // Cannot sync if offline
  const resOffline = validateOfflineSync(5, false, false);
  assert.equal(resOffline.canSync, false);
  assert.equal(resOffline.reason?.includes('sem conexão'), true);

  // Cannot sync if queue is empty
  const resEmpty = validateOfflineSync(0, true, false);
  assert.equal(resEmpty.canSync, false);
  assert.equal(resEmpty.reason?.includes('vazia'), true);
});
