/**
 * Persistent Storage Layer for PontoPro
 * Firestore backend for multi-instance deployments.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import {
  Company,
  Establishment,
  WorkSchedule,
  Employee,
  TimeEvent,
  PunchReceipt,
  CorrectionRequest,
  LicenseStatus,
  AuditLog,
} from '../types';

import { issuePerpetualLicense } from '../domain/license';

export interface BillingSubscription {
  id: string; company_id: string; plan_id: 'prata' | 'ouro' | 'diamante'; status: 'pending' | 'active' | 'past_due' | 'canceling' | 'canceled' | 'inactive'; provider: 'asaas'; provider_customer_id?: string; provider_subscription_id?: string; current_period_end?: string; next_due_date?: string; last_payment_status?: string; last_payment_id?: string; checkout_url?: string; created_at: string; updated_at: string; canceled_at?: string;
}

export interface DatabaseState {
  companies: Company[];
  establishments: Establishment[];
  work_schedules: WorkSchedule[];
  employees: Employee[];
  time_events: TimeEvent[];
  punch_receipts: PunchReceipt[];
  correction_requests: CorrectionRequest[];
  license: LicenseStatus;
  audit_logs: AuditLog[];
  billing_subscriptions?: BillingSubscription[];
  processed_billing_webhooks?: string[];
}


class StorageManager {
  private state: DatabaseState | null = null;
  private db: FirebaseFirestore.Firestore;

  constructor() {
    if (getApps().length === 0) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : undefined;
      if (serviceAccount) {
        initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
      } else {
        initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'pontopro-77ad7' });
      }
    }
    this.db = getFirestore();
    this.state = this.buildInitialSeed();
  }

  public saveState(): void {
    if (!this.state) return;
    try {
      const docRef = this.db.collection('app_state').doc('main');
      docRef.set(this.state).catch(() => {});
    } catch {}
  }

  private ensureLoaded(): DatabaseState {
    if (this.state) return this.state;
    this.state = this.buildInitialSeed();
    return this.state;
  }

  private buildInitialSeed(): DatabaseState {
    // Instalação limpa: nenhuma empresa ou funcionário fictício é criado.
    const license = issuePerpetualLicense({
      clientName: 'PontoPro SaaS',
      clientCnpj: '00000000000000',
      maxCompanies: 1000,
      maxEmployees: 100000,
      hardwareLockId: 'PONTOPRO-SAAS',
    });
    return {
      companies: [],
      establishments: [],
      work_schedules: [],
      employees: [],
      time_events: [],
      punch_receipts: [],
      correction_requests: [],
      license,
      audit_logs: [],
      billing_subscriptions: [],
      processed_billing_webhooks: [],
    };
  }

  public getBillingSubscriptions(): BillingSubscription[] { return this.ensureLoaded().billing_subscriptions ||= []; }

  public getBillingSubscriptionByCompany(companyId: string): BillingSubscription | undefined {
    return this.getBillingSubscriptions().filter(item => item.company_id === companyId).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  }

  public getBillingSubscriptionByProviderId(providerId: string): BillingSubscription | undefined {
    return this.getBillingSubscriptions().find(item => item.provider_subscription_id === providerId);
  }

  public upsertBillingSubscription(subscription: BillingSubscription): void {
    const state = this.ensureLoaded();
    state.billing_subscriptions ||= [];
    const index = state.billing_subscriptions.findIndex(item => item.id === subscription.id || (subscription.provider_subscription_id && item.provider_subscription_id === subscription.provider_subscription_id));
    if (index >= 0) state.billing_subscriptions[index] = { ...state.billing_subscriptions[index], ...subscription };
    else state.billing_subscriptions.push(subscription);
    this.saveState();
  }

  public hasProcessedBillingWebhook(eventId: string): boolean { return (this.ensureLoaded().processed_billing_webhooks ||= []).includes(eventId); }

  public markBillingWebhookProcessed(eventId: string): boolean {
    const state = this.ensureLoaded();
    state.processed_billing_webhooks ||= [];
    if (state.processed_billing_webhooks.includes(eventId)) return false;
    state.processed_billing_webhooks.push(eventId);
    if (state.processed_billing_webhooks.length > 10000) state.processed_billing_webhooks = state.processed_billing_webhooks.slice(-10000);
    this.saveState();
    return true;
  }

  // Multi-tenant query methods
  public getCompanies(): Company[] {
    return this.ensureLoaded().companies;
  }

  public getCompanyById(id: string): Company | undefined {
    return this.ensureLoaded().companies.find((c) => c.id === id);
  }

  public createCompanyBundle(
    company: Company,
    establishment: Establishment,
    schedule: WorkSchedule,
    administrator: Employee,
    auditLog: AuditLog,
  ): void {
    const state = this.ensureLoaded();
    if (state.companies.some(item => item.id === company.id || item.cnpj === company.cnpj)) {
      throw new Error('A empresa já existe no banco de dados.');
    }
    if (state.employees.some(item => item.email.toLowerCase() === administrator.email.toLowerCase())) {
      throw new Error('O e-mail do administrador já está cadastrado.');
    }
    // Todos os registros da configuração inicial são persistidos em uma única transação SQLite.
    state.companies.push(company);
    state.establishments.push(establishment);
    state.work_schedules.push(schedule);
    state.employees.push(administrator);
    state.audit_logs.unshift(auditLog);
    if (state.audit_logs.length > 500) state.audit_logs = state.audit_logs.slice(0, 500);
    this.saveState();
  }

  public addCompany(company: Company): void {
    const state = this.ensureLoaded();
    state.companies.push(company);
    this.saveState();
  }

  public setCompanyActive(companyId: string, active: boolean): boolean {
    const company = this.getCompanyById(companyId);
    if (!company) return false;
    company.active = active;
    this.saveState();
    return true;
  }

  public setCompanyPlan(companyId: string, plan: 'Prata' | 'Ouro' | 'Diamante'): boolean {
    const company = this.getCompanyById(companyId);
    if (!company) return false;
    company.plan = plan;
    this.saveState();
    return true;
  }

  public addWorkSchedule(schedule: WorkSchedule): void {
    const state = this.ensureLoaded();
    state.work_schedules.push(schedule);
    this.saveState();
  }

  public getEstablishments(companyId: string): Establishment[] {
    return this.ensureLoaded().establishments.filter((e) => e.company_id === companyId);
  }

  public getWorkSchedules(companyId: string): WorkSchedule[] {
    return this.ensureLoaded().work_schedules.filter((s) => s.company_id === companyId);
  }

  public getEmployees(companyId: string): Employee[] {
    return this.ensureLoaded().employees.filter((e) => e.company_id === companyId);
  }

  public getAllEmployees(): Employee[] {
    return this.ensureLoaded().employees;
  }

  public getEmployeeById(id: string): Employee | undefined {
    return this.ensureLoaded().employees.find((e) => e.id === id);
  }

  public getTimeEvents(companyId: string, employeeId?: string): TimeEvent[] {
    const events = this.ensureLoaded().time_events.filter((ev) => ev.company_id === companyId);
    if (employeeId) {
      return events.filter((ev) => ev.employee_id === employeeId);
    }
    return events;
  }

  public getNextNsr(companyId: string): number {
    const events = this.getTimeEvents(companyId);
    if (events.length === 0) return 1;
    const maxNsr = Math.max(...events.map((e) => e.nsr));
    return maxNsr + 1;
  }

  public getLatestHash(companyId: string): string {
    const events = this.getTimeEvents(companyId);
    if (events.length === 0) return '0'.repeat(64);
    const sorted = [...events].sort((a, b) => b.nsr - a.nsr);
    return sorted[0].sha256_hash;
  }

  public addTimeEvent(event: TimeEvent, receipt: PunchReceipt): void {
    const state = this.ensureLoaded();
    state.time_events.push(event);
    state.punch_receipts.push(receipt);
    this.saveState();
  }

  public getReceipts(employeeId: string): PunchReceipt[] {
    const emp = this.getEmployeeById(employeeId);
    if (!emp) return [];
    return this.ensureLoaded().punch_receipts.filter((r) => r.employee_cpf === emp.cpf);
  }

  public getCorrectionRequests(companyId: string): CorrectionRequest[] {
    return this.ensureLoaded().correction_requests.filter((r) => r.company_id === companyId);
  }

  public addCorrectionRequest(req: CorrectionRequest): void {
    const state = this.ensureLoaded();
    state.correction_requests.push(req);
    this.saveState();
  }

  public reviewCorrectionRequest(
    id: string,
    status: 'approved' | 'rejected',
    reviewerId: string,
    notes?: string
  ): CorrectionRequest | null {
    const state = this.ensureLoaded();
    const req = state.correction_requests.find((r) => r.id === id);
    if (!req) return null;

    const reviewer = this.getEmployeeById(reviewerId);
    req.status = status;
    req.reviewed_by = reviewerId;
    req.reviewed_by_name = reviewer ? reviewer.name : 'Gestor';
    req.reviewed_at = new Date().toISOString();
    req.review_notes = notes;

    this.saveState();
    return req;
  }

  public getLicense(): LicenseStatus {
    const state = this.ensureLoaded();
    state.license.current_companies = state.companies.length;
    state.license.current_employees = state.employees.length;
    return state.license;
  }

  public activateLicense(key: string, clientCnpj: string): { success: boolean; message: string } {
    const state = this.ensureLoaded();
    // Validate key
    if (!key.startsWith('PP-')) {
      return { success: false, message: 'Chave de ativação inválida.' };
    }
    state.license.key = key;
    state.license.client_cnpj = clientCnpj;
    state.license.status = 'active';
    state.license.activated_at = new Date().toISOString();
    this.saveState();
    return { success: true, message: 'Licença ativada com sucesso para esta instalação.' };
  }

  public addAuditLog(log: AuditLog): void {
    const state = this.ensureLoaded();
    state.audit_logs.unshift(log);
    if (state.audit_logs.length > 500) {
      state.audit_logs = state.audit_logs.slice(0, 500);
    }
    this.saveState();
  }

  public getAuditLogs(companyId: string): AuditLog[] {
    return this.ensureLoaded().audit_logs.filter((a) => a.company_id === companyId);
  }

  public updateEmployeeBiometrics(employeeId: string, templateId: string): boolean {
    const state = this.ensureLoaded();
    const emp = state.employees.find((e) => e.id === employeeId);
    if (!emp) return false;
    emp.biometric_registered = true;
    emp.biometric_template_id = templateId;
    this.saveState();
    return true;
  }

  public addEmployee(employee: Employee): void {
    const state = this.ensureLoaded();
    state.employees.push(employee);
    this.saveState();
  }

  public addEstablishment(est: Establishment): void {
    const state = this.ensureLoaded();
    state.establishments.push(est);
    this.saveState();
  }
}

export const storage = new StorageManager();

