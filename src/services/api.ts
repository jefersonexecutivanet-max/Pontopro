/**
 * Frontend API Service with Offline Queue & IndexedDB/LocalStorage Persistence
 */

import {
  Company,
  Establishment,
  Employee,
  WorkSchedule,
  TimeEvent,
  PunchReceipt,
  CorrectionRequest,
  LicenseStatus,
  AuditLog,
} from '../types';

export interface OfflinePunchPayload {
  idempotency_key: string;
  company_id: string;
  establishment_id: string;
  employee_id: string;
  event_type: string;
  occurred_at: string;
  device_id: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  biometric_verified: boolean;
  biometric_score?: number;
  biometric_photo?: string;
  is_offline?: boolean;
  location_permission_granted?: boolean;
}

const OFFLINE_QUEUE_KEY = 'pontopro_offline_punch_queue';
const OFFLINE_QUEUE_BACKUP_KEY = 'pontopro_offline_punch_queue_corrupt_backup';

export function getOfflineQueue(): OfflinePunchPayload[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('A fila offline nÃ£o contÃ©m uma lista vÃ¡lida.');
    return parsed as OfflinePunchPayload[];
  } catch (error) {
    // Preserve corrupted data for diagnosis instead of silently deleting it.
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (raw) localStorage.setItem(OFFLINE_QUEUE_BACKUP_KEY, raw);
    } catch (backupError) {
      console.error('NÃ£o foi possÃ­vel preservar a fila offline corrompida.', backupError);
    }
    console.error('A fila offline nÃ£o pÃ´de ser lida. Uma cÃ³pia de recuperaÃ§Ã£o foi tentada.', error);
    return [];
  }
}

export function saveOfflineQueue(queue: OfflinePunchPayload[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    // Propagate quota/security errors so the UI cannot claim that a punch was saved.
    throw new Error('NÃ£o foi possÃ­vel salvar a marcaÃ§Ã£o no armazenamento local deste dispositivo. Libere espaÃ§o e tente novamente.');
  }
}

export function enqueueOfflinePunch(punch: OfflinePunchPayload): void {
  const current = getOfflineQueue();
  if (current.some((item) => item.idempotency_key === punch.idempotency_key)) return;
  current.push(punch);
  saveOfflineQueue(current);
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

const AUTH_TOKEN_KEY = 'pontopro_auth_session_token';
function getAuthToken(): string | null {
  try { return sessionStorage.getItem(AUTH_TOKEN_KEY); } catch { return null; }
}
function setAuthToken(token: string): void {
  try { sessionStorage.setItem(AUTH_TOKEN_KEY, token); } catch {}
}
function clearAuthToken(): void {
  try { sessionStorage.removeItem(AUTH_TOKEN_KEY); } catch {}
}
async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}


export const api = {
  hasAuthSession() {
    return Boolean(getAuthToken());
  },

  clearAuthSession() {
    clearAuthToken();
  },

  async getMe() {
    const res = await authorizedFetch('/api/auth/me');
    if (res.status === 401) {
      clearAuthToken();
      throw new Error('Sua sessão expirou. Entre novamente.');
    }
    if (!res.ok) throw new Error('Não foi possível verificar a sessão. Tente novamente.');
    return res.json() as Promise<{
      employee: Employee;
      company: Company;
      establishment: Establishment;
    }>;
  },

  async login(identifier: string, password?: string, mode?: 'employee' | 'admin') {
    const res = await authorizedFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, mode }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Credenciais invÃ¡lidas.');
    }
    const result = (await res.json()) as {
      success: boolean;
      token: string;
      employee: Employee;
      company: Company;
      establishment: Establishment;
    };
    if (result.token) setAuthToken(result.token);
    return result;
  },

  async logout() {
    await authorizedFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    clearAuthToken();
  },

  async getCompanies(): Promise<Company[]> {
    const res = await authorizedFetch('/api/companies');
    return res.json();
  },

  async getEstablishments(companyId: string): Promise<Establishment[]> {
    const res = await authorizedFetch(`/api/establishments?companyId=${companyId}`);
    return res.json();
  },

  async createEstablishment(data: Partial<Establishment>): Promise<Establishment> {
    const res = await authorizedFetch('/api/establishments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getEmployees(companyId: string): Promise<Employee[]> {
    const res = await authorizedFetch(`/api/employees?companyId=${companyId}`);
    return res.json();
  },

  async createEmployee(data: Partial<Employee>): Promise<Employee> {
    const res = await authorizedFetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async registerBiometrics(employeeId: string): Promise<{ success: boolean; message: string }> {
    const res = await authorizedFetch(`/api/employees/${employeeId}/biometrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: `BIO-${employeeId}-${Date.now()}` }),
    });
    return res.json();
  },

  async getSchedules(companyId: string): Promise<WorkSchedule[]> {
    const res = await authorizedFetch(`/api/schedules?companyId=${companyId}`);
    return res.json();
  },

  async getPunches(companyId: string, employeeId?: string): Promise<TimeEvent[]> {
    const url = employeeId
      ? `/api/punches?companyId=${companyId}&employeeId=${employeeId}`
      : `/api/punches?companyId=${companyId}`;
    const res = await authorizedFetch(url);
    return res.json();
  },

  async getReceipts(employeeId: string): Promise<PunchReceipt[]> {
    const res = await authorizedFetch(`/api/receipts/${employeeId}`);
    return res.json();
  },

  async recordPunch(
    payload: OfflinePunchPayload,
    isForceOffline: boolean = false
  ): Promise<{
    event: TimeEvent;
    receipt: PunchReceipt;
    isQueuedOffline?: boolean;
  }> {
    if (!payload.biometric_photo) throw new Error('A foto Ã© obrigatÃ³ria em todas as marcaÃ§Ãµes.');
    if (!payload.location_permission_granted) throw new Error('Conceda a permissÃ£o de localizaÃ§Ã£o antes de registrar o ponto.');
    if (isForceOffline || !navigator.onLine) {
      payload.is_offline = true;
      // Save locally to offline queue
      enqueueOfflinePunch(payload);

      // Generate provisional local receipt for immediate worker feedback
      const provisionalReceipt: PunchReceipt = {
        nsr: 0,
        company_cnpj: '',
        company_name: 'Aguardando sincronizaÃ§Ã£o',
        employee_cpf: 'NÃ£o disponÃ­vel offline',
        employee_name: 'FuncionÃ¡rio autenticado',
        employee_pis: 'NÃ£o disponÃ­vel offline',
        event_type: payload.event_type as any,
        occurred_at: payload.occurred_at,
        received_at: 'Aguardando SincronizaÃ§Ã£o',
        sha256_hash: 'PENDENTE_SINCRONIZACAO_OFFLINE',
        signature: 'PENDENTE_DE_SINCRONIZACAO',
        receipt_code: `OFFLINE-${payload.idempotency_key.slice(-8)}`,
        inpi_registration: '',
      };

      const provisionalEvent: TimeEvent = {
        id: `offline-${Date.now()}`,
        nsr: 0,
        company_id: payload.company_id,
        establishment_id: payload.establishment_id,
        employee_id: payload.employee_id,
        event_type: payload.event_type as any,
        occurred_at: payload.occurred_at,
        received_at: 'Aguardando SincronizaÃ§Ã£o',
        is_offline: true,
        sync_status: 'pending',
        device_id: payload.device_id,
        latitude: payload.latitude,
        longitude: payload.longitude,
        location_status: 'unavailable',
        biometric_verified: payload.biometric_verified,
        biometric_score: payload.biometric_score,
        biometric_photo: payload.biometric_photo,
        sha256_hash: '0'.repeat(64),
        previous_hash: '0'.repeat(64),
        idempotency_key: payload.idempotency_key,
      };

      return {
        event: provisionalEvent,
        receipt: provisionalReceipt,
        isQueuedOffline: true,
      };
    }

    payload.is_offline = false;
    const res = await authorizedFetch('/api/punches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error('Falha ao registrar ponto no servidor.');
    }

    return res.json();
  },

  async syncOfflineBatch(companyId: string) {
    const currentSnapshot = getOfflineQueue();
    const snapshot = currentSnapshot.filter((item) => item.company_id === companyId);
    if (snapshot.length === 0) {
      return { processed: 0, duplicatesIgnored: 0, errors: [], remaining: currentSnapshot.length, remainingForCompany: 0 };
    }

    const res = await authorizedFetch('/api/sync/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId, items: snapshot }),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || 'Falha ao sincronizar lote offline. Os registros continuam na fila local.');
    }

    const data = await res.json() as {
      processed: number;
      duplicatesIgnored: number;
      errors?: Array<{ idempotency_key: string; reason: string }>;
      resolvedKeys?: string[];
    };

    // Only remove records the server confirms as stored or already synchronized.
    // Keep failed records and records added while this request was in flight.
    const resolvedKeys = new Set(data.resolvedKeys || []);
    if (resolvedKeys.size > 0) {
      const currentQueue = getOfflineQueue();
      saveOfflineQueue(currentQueue.filter((item) => !resolvedKeys.has(item.idempotency_key)));
    } else if (!data.errors?.length && data.processed + data.duplicatesIgnored >= snapshot.length) {
      // Backward-compatible path for an older server response that fully processed the batch.
      const currentQueue = getOfflineQueue();
      const snapshotKeys = new Set(snapshot.map((item) => item.idempotency_key));
      saveOfflineQueue(currentQueue.filter((item) => !snapshotKeys.has(item.idempotency_key)));
    }

    const remainingQueue = getOfflineQueue();
    return {
      ...data,
      remaining: remainingQueue.length,
      remainingForCompany: remainingQueue.filter((item) => item.company_id === companyId).length,
    };
  },

  async getCorrections(companyId: string): Promise<CorrectionRequest[]> {
    const res = await authorizedFetch(`/api/corrections?companyId=${companyId}`);
    return res.json();
  },

  async createCorrection(data: Partial<CorrectionRequest>): Promise<CorrectionRequest> {
    const res = await authorizedFetch('/api/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async reviewCorrection(id: string, status: 'approved' | 'rejected', notes?: string) {
    const res = await authorizedFetch(`/api/corrections/${id}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    return res.json();
  },

  async batchApproveCorrections(companyId: string, ids?: string[], notes?: string) {
    const res = await authorizedFetch('/api/corrections/batch-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, ids, notes }),
    });
    return res.json();
  },

  async getLicenseStatus(): Promise<LicenseStatus> {
    const res = await authorizedFetch('/api/license/status');
    return res.json();
  },

  async getAuditLogs(companyId: string): Promise<AuditLog[]> {
    const res = await authorizedFetch(`/api/audit-logs?companyId=${companyId}`);
    return res.json();
  },

  downloadAfd(companyId: string) {
    window.location.href = `/api/reports/afd?companyId=${companyId}`;
  },

  downloadTechnicalTerm(companyId: string) {
    window.open(`/api/reports/technical-term?companyId=${companyId}`, '_blank');
  },


  async getBillingSubscription() {
    const res = await authorizedFetch('/api/billing/subscription');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Não foi possível consultar a assinatura.');
    return data;
  },

  async createBillingSubscription(plan: 'prata' | 'ouro' | 'diamante', billingType: 'BOLETO' | 'CREDIT_CARD' = 'BOLETO') {
    const res = await authorizedFetch('/api/billing/subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, billing_type: billingType }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Não foi possível iniciar a assinatura.');
    return data;
  },

  async cancelBillingSubscription() {
    const res = await authorizedFetch('/api/billing/subscription/cancel', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Não foi possível cancelar a assinatura.');
    return data;
  },
};
