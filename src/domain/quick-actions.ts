/**
 * Quick Actions Domain Logic & Permission Governance
 * Pure deterministic functions for security, batch validation, and quick actions state.
 */

import { UserRole, CorrectionRequest } from '../types';

/**
 * Validates whether a user role has authorization to approve time corrections.
 * Under Portaria 671 and Brazilian labor law, only managers, company admins,
 * and system owners can approve adjustments. Employees and Auditors are read-only for approvals.
 */
export function canUserApproveCorrections(role?: UserRole | string | null): boolean {
  if (!role) return false;
  return ['manager', 'company_admin', 'saas_owner'].includes(role);
}

export interface QuickActionsSummary {
  urgentCount: number;
  statusText: string;
  canSync: boolean;
  needsAttention: boolean;
  hasPendingCorrections: boolean;
  hasPendingOffline: boolean;
}

/**
 * Calculates high-level summary and urgency counters for Quick Actions
 */
export function getQuickActionsSummary(params: {
  pendingCorrectionsCount: number;
  pendingOfflineCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  userRole?: UserRole | string | null;
}): QuickActionsSummary {
  const { pendingCorrectionsCount, pendingOfflineCount, isOnline, isSyncing } = params;
  const urgentCount = pendingCorrectionsCount + pendingOfflineCount;
  const hasPendingCorrections = pendingCorrectionsCount > 0;
  const hasPendingOffline = pendingOfflineCount > 0;
  const canSync = isOnline && !isSyncing && hasPendingOffline;

  let statusText = 'Tudo em dia';
  if (hasPendingCorrections && hasPendingOffline) {
    statusText = `${pendingCorrectionsCount} ajuste(s) e ${pendingOfflineCount} offline`;
  } else if (hasPendingCorrections) {
    statusText = `${pendingCorrectionsCount} ajuste(s) pendente(s)`;
  } else if (hasPendingOffline) {
    statusText = `${pendingOfflineCount} batida(s) offline`;
  }

  return {
    urgentCount,
    statusText,
    canSync,
    needsAttention: urgentCount > 0,
    hasPendingCorrections,
    hasPendingOffline,
  };
}

/**
 * Formats statistics for pending corrections
 */
export function formatPendingCorrectionsSummary(corrections: CorrectionRequest[]): {
  total: number;
  uniqueEmployees: number;
  oldestDate?: string;
} {
  const pending = corrections.filter((c) => c.status === 'pending');
  const uniqueEmployeeIds = new Set(pending.map((c) => c.employee_id));

  let oldestDate: string | undefined = undefined;
  if (pending.length > 0) {
    const dates = pending.map((c) => c.requested_date).sort();
    oldestDate = dates[0];
  }

  return {
    total: pending.length,
    uniqueEmployees: uniqueEmployeeIds.size,
    oldestDate,
  };
}

/**
 * Validates batch approval safety
 */
export function validateBatchApproval(
  corrections: CorrectionRequest[],
  userRole?: UserRole | string | null
): { allowed: boolean; reason?: string; count: number } {
  if (!canUserApproveCorrections(userRole)) {
    return {
      allowed: false,
      reason: 'Aprovação restrita a Gestores e Administradores autorizados.',
      count: 0,
    };
  }

  const pending = corrections.filter((c) => c.status === 'pending');
  if (pending.length === 0) {
    return {
      allowed: false,
      reason: 'Nenhuma solicitação pendente para aprovação.',
      count: 0,
    };
  }

  return {
    allowed: true,
    count: pending.length,
  };
}

/**
 * Validates offline sync conditions
 */
export function validateOfflineSync(
  queueCount: number,
  isOnline: boolean,
  isSyncing: boolean
): { canSync: boolean; reason?: string } {
  if (isSyncing) {
    return { canSync: false, reason: 'Sincronização já em andamento.' };
  }
  if (!isOnline) {
    return { canSync: false, reason: 'Dispositivo sem conexão à internet.' };
  }
  if (queueCount <= 0) {
    return { canSync: false, reason: 'Fila offline vazia. Nenhuma batida pendente.' };
  }
  return { canSync: true };
}
