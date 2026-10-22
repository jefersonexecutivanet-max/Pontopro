/**
 * Persistent Storage Layer for PontoPro
 * Durable SQLite state store for a single persistent Node server. Uses atomic transactions and daily local backups. Multi-instance/serverless deployments still require a managed shared database adapter.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
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
import { computeEventHash, generatePunchReceipt } from '../domain/rep-p';
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

const DATA_DIR = path.resolve(process.env.PONTOPRO_DATA_DIR || path.join(process.cwd(), 'data'));
const DB_FILE = path.join(DATA_DIR, 'pontopro.sqlite');
const LEGACY_DB_FILE = path.join(DATA_DIR, 'pontopro.db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

class StorageManager {
  private state: DatabaseState | null = null;
  private db: DatabaseSync;

  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(DB_FILE);
    try { fs.chmodSync(DB_FILE, 0o600); } catch { /* ACLs do Windows são gerenciadas pelo sistema operacional. */ }
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON;');
    this.db.exec(`CREATE TABLE IF NOT EXISTS pontopro_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    this.ensureLoaded();
  }

  private ensureLoaded(): DatabaseState {
    if (this.state) return this.state;

    const row = this.db.prepare('SELECT payload FROM pontopro_state WHERE id = 1').get() as { payload: string } | undefined;
    if (row?.payload) {
      try {
        this.state = JSON.parse(row.payload) as DatabaseState;
        this.state.billing_subscriptions ||= [];
        this.state.processed_billing_webhooks ||= [];
        return this.state;
      } catch (err) {
        throw new Error(`O banco SQLite do PontoPro está corrompido. Não foi reinicializado para evitar perda de dados. Detalhe: ${String(err)}`);
      }
    }

    // Migração automática do banco JSON usado nas versões anteriores, sem apagar o original.
    if (fs.existsSync(LEGACY_DB_FILE)) {
      try {
        this.state = JSON.parse(fs.readFileSync(LEGACY_DB_FILE, 'utf8')) as DatabaseState;
        this.saveState();
        const migratedBackup = `${LEGACY_DB_FILE}.migrated-backup`;
        if (!fs.existsSync(migratedBackup)) fs.copyFileSync(LEGACY_DB_FILE, migratedBackup);
        console.log('[PontoPro] Dados JSON migrados para SQLite; cópia anterior preservada.');
        return this.state;
      } catch (err) {
        throw new Error(`Falha ao migrar o banco JSON. Os dados originais foram preservados. Detalhe: ${String(err)}`);
      }
    }

    this.state = this.buildInitialSeed();
    this.saveState();
    return this.state;
  }

  private createDailyBackup(): void {
    const row = this.db.prepare('SELECT id FROM pontopro_state WHERE id = 1').get();
    if (!row || !fs.existsSync(DB_FILE)) return;
    const day = new Date().toISOString().slice(0, 10);
    fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
    const backupFile = path.join(BACKUP_DIR, `pontopro-${day}.sqlite`);
    if (fs.existsSync(backupFile)) return;
    this.db.exec('PRAGMA wal_checkpoint(FULL)');
    fs.copyFileSync(DB_FILE, backupFile);
    try { fs.chmodSync(backupFile, 0o600); } catch { /* ACLs do Windows são gerenciadas pelo sistema operacional. */ }
    // Mantém no máximo 30 cópias diárias locais; backups externos continuam recomendados.
    const backups = fs.readdirSync(BACKUP_DIR).filter(name => /^pontopro-\d{4}-\d{2}-\d{2}\.sqlite$/.test(name)).sort();
    for (const old of backups.slice(0, Math.max(0, backups.length - 30))) {
      try { fs.unlinkSync(path.join(BACKUP_DIR, old)); } catch (err) { console.warn('[PontoPro] Não foi possível remover backup antigo:', err); }
    }
  }

  public saveState(): void {
    if (!this.state) return;
    this.createDailyBackup();
    const statement = this.db.prepare(`INSERT INTO pontopro_state (id, payload, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      statement.run(JSON.stringify(this.state), new Date().toISOString());
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
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
