import 'dotenv/config';
/**
 * PontoPro Full-Stack Express Server & Vite Dev Middleware
 * Port 3000
 */

import express from 'express';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from './src/db/storage';
import { computeEventHash, generatePunchReceipt, generateAfdContent, getTechnicalTerm } from './src/domain/rep-p';
import { evaluateGeofence, processSyncBatch } from './src/domain/sync-engine';
import { validateLicenseKey, issuePerpetualLicense } from './src/domain/license';
import { TimeEvent, Employee, EventType } from './src/types';
import { isValidCnpj, normalizeCnpj } from './src/utils/cnpj';
import type { BillingSubscription } from './src/db/storage';
import { BILLING_PLANS, normalizeBillingPlan, resolveBillingStatus, canAddEmployee } from './src/domain/billing';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const DATA_DIR = path.resolve(process.env.PONTOPRO_DATA_DIR || path.join(process.cwd(), 'data'));
  const OWNER_FILE = path.join(DATA_DIR, 'owner-account.json');
  const ownerSessions = new Map<string, { email: string; createdAt: number }>();
  const userSessions = new Map<string, { userId: string; createdAt: number }>();
  const billingCreationLocks = new Set<string>();
  const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

  const hashSecret = (secret: string, salt = crypto.randomBytes(16).toString('hex')) => {
    const digest = crypto.scryptSync(secret, salt, 64).toString('hex');
    return `${salt}:${digest}`;
  };
  const verifySecret = (secret: string, stored: string | undefined) => {
    if (!stored || !stored.includes(':')) return false;
    const [salt, expectedHex] = stored.split(':');
    const actual = crypto.scryptSync(secret, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  };


  const readOwner = () => {
    try { return JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8')) as { email: string; password_hash: string }; }
    catch { return null; }
  };
  if (process.env.NODE_ENV === 'production' && !readOwner()) {
    const bootstrapEmail = String(process.env.PONTOPRO_OWNER_EMAIL || '').trim().toLowerCase();
    const bootstrapPassword = String(process.env.PONTOPRO_OWNER_PASSWORD || '');
    if (!/^\S+@\S+\.\S+$/.test(bootstrapEmail) || bootstrapPassword.length < 12) {
      throw new Error('Configure PONTOPRO_OWNER_EMAIL e PONTOPRO_OWNER_PASSWORD (mínimo 12 caracteres) no gerenciador de segredos antes de iniciar em produção.');
    }
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(OWNER_FILE, JSON.stringify({ email: bootstrapEmail, password_hash: hashSecret(bootstrapPassword) }, null, 2), { mode: 0o600 });
  }

  const bearerToken = (req: express.Request) => String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const ownerAuthorized = (req: express.Request) => {
    const token = bearerToken(req);
    const session = token ? ownerSessions.get(token) : undefined;
    if (!session) return false;
    if (Date.now() - session.createdAt > SESSION_TTL_MS) { ownerSessions.delete(token); return false; }
    return true;
  };
  const authenticatedEmployee = (req: express.Request): Employee | undefined => {
    const token = bearerToken(req);
    const session = token ? userSessions.get(token) : undefined;
    if (!session) return undefined;
    if (Date.now() - session.createdAt > SESSION_TTL_MS) { userSessions.delete(token); return undefined; }
    const employee = storage.getEmployeeById(session.userId);
    if (!employee || !employee.active) { userSessions.delete(token); return undefined; }
    const company = storage.getCompanyById(employee.company_id);
    return company?.active ? employee : undefined;
  };
  const publicEmployee = (employee: Employee) => {
    const { password_hash: _passwordHash, pin_hash: _pinHash, pin: _pin, ...safeEmployee } = employee;
    return safeEmployee;
  };
  const publicCompany = (company: import('./src/types').Company) => ({ ...company, license_key: '' });

  const planIdFrom = normalizeBillingPlan;
  const planForCompany = (company: import('./src/types').Company) => {
    const id = planIdFrom(company.plan) || 'diamante'; // Compatibilidade: não limitar empresas antigas até definir o plano delas.
    return BILLING_PLANS[id];
  };
  const asaasBaseUrl = process.env.ASAAS_ENVIRONMENT === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
  const asaasRequest = async (endpoint: string, init: RequestInit = {}) => {
    const apiKey = String(process.env.ASAAS_API_KEY || '').trim();
    if (!apiKey) throw new Error('Integração Asaas não configurada. Defina ASAAS_API_KEY no ambiente do servidor.');
    const response = await fetch(`${asaasBaseUrl}${endpoint}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', access_token: apiKey, ...(init.headers || {}) },
    });
    const payload = await response.json().catch(() => ({})) as Record<string, any>;
    if (!response.ok) {
      const detail = Array.isArray(payload.errors) ? payload.errors.map((e: any) => e.description || e.code).filter(Boolean).join('; ') : '';
      throw new Error(detail || `Asaas retornou HTTP ${response.status}.`);
    }
    return payload;
  };

  app.disable('x-powered-by');
  app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self), microphone=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    if (process.env.NODE_ENV === 'production' && req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '15mb' }));

  // Catálogo público: preços em centavos, sem credenciais do provedor.
  app.get('/api/billing/plans', (_req, res) => {
    res.json(Object.values(BILLING_PLANS).map(plan => ({ id: plan.id, name: plan.name, price_cents: plan.priceCents, price_monthly: plan.priceCents / 100, max_employees: plan.maxEmployees, currency: 'BRL', interval: 'MONTHLY' })));
  });

  // Webhook Asaas: o token exclusivo do webhook é diferente da chave de API.
  app.post('/api/billing/webhook/asaas', async (req, res) => {
    const expectedToken = Buffer.from(String(process.env.ASAAS_WEBHOOK_TOKEN || ''));
    const suppliedToken = Buffer.from(String(req.headers['asaas-access-token'] || ''));
    if (!expectedToken.length || suppliedToken.length !== expectedToken.length || !crypto.timingSafeEqual(suppliedToken, expectedToken)) {
      return res.status(401).json({ error: 'Webhook não autenticado.' });
    }
    const eventId = String(req.body?.id || '');
    const eventName = String(req.body?.event || '');
    if (!eventId || !eventName) return res.status(400).json({ error: 'Evento do webhook inválido.' });
    if (storage.hasProcessedBillingWebhook(eventId)) return res.status(200).json({ received: true, duplicate: true });
    try {
      const payment = req.body?.payment || {};
      const remoteSubscription = req.body?.subscription || {};
      const providerSubscriptionId = String(payment.subscription || remoteSubscription.id || '');
      const local = providerSubscriptionId ? storage.getBillingSubscriptionByProviderId(providerSubscriptionId) : undefined;
      if (local) {
        const now = new Date().toISOString();
        const paymentStatus = String(payment.status || '');
        const status = resolveBillingStatus(local.status, eventName, paymentStatus, String(remoteSubscription.status || ''));
        const updated: BillingSubscription = { ...local, status, updated_at: now, last_payment_status: paymentStatus || local.last_payment_status, last_payment_id: String(payment.id || local.last_payment_id || ''), next_due_date: String(remoteSubscription.nextDueDate || local.next_due_date || ''), current_period_end: String(remoteSubscription.nextDueDate || local.current_period_end || '') };
        storage.upsertBillingSubscription(updated);
        if (status === 'active') {
          const paidPlan = BILLING_PLANS[local.plan_id];
          storage.setCompanyPlan(local.company_id, paidPlan.name as 'Prata' | 'Ouro' | 'Diamante');
        }
      } else {
        console.warn(`[Billing] Evento Asaas ${eventName} recebido sem assinatura local correspondente.`);
      }
      storage.markBillingWebhookProcessed(eventId);
      return res.status(200).json({ received: true, duplicate: false });
    } catch (error) {
      console.error('[Billing] Falha ao processar webhook Asaas:', error);
      return res.status(500).json({ error: 'Falha temporária ao processar webhook.' });
    }
  });

  // Request logger for audit & security compliance
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[API ${req.method}] ${req.path}`);
    }
    next();
  });

  // Authentication is session-token based; no global active user is shared across browser sessions.
  const failedLogins = new Map<string, { count: number; firstAt: number; blockedUntil?: number }>();
  const failedOwnerLogins = new Map<string, { count: number; firstAt: number; blockedUntil?: number }>();

  // -------------------------------------------------------------
  // AUTH & USER ENDPOINTS (PORTARIA MTP 671/2021)
  // -------------------------------------------------------------
  // Proprietário SaaS: configuração inicial de uso único e sessão administrativa independente.
  app.get('/api/owner/setup-status', (_req, res) => {
    res.json({ configured: Boolean(readOwner()) });
  });

  app.post('/api/owner/setup', (req, res) => {
    const remote = String(req.ip || '');
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) return res.status(403).json({ error: 'A configuração inicial do proprietário deve ser feita no próprio computador servidor, usando localhost.' });
    if (readOwner()) return res.status(409).json({ error: 'O proprietário já foi configurado. Faça login.' });
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12) {
      return res.status(400).json({ error: 'Informe um e-mail válido e uma senha com pelo menos 12 caracteres.' });
    }
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(OWNER_FILE, JSON.stringify({ email, password_hash: hashSecret(password) }, null, 2), { mode: 0o600 });
    const token = crypto.randomBytes(32).toString('hex');
    ownerSessions.set(token, { email, createdAt: Date.now() });
    res.json({ success: true, token, owner: { email } });
  });

  app.post('/api/owner/login', (req, res) => {
    const ipKey = String(req.ip || 'unknown');
    const now = Date.now();
    const attempts = failedOwnerLogins.get(ipKey);
    if (attempts?.blockedUntil && attempts.blockedUntil > now) return res.status(429).json({ error: 'Muitas tentativas de acesso ao proprietário. Aguarde 15 minutos.' });
    if (attempts && now - attempts.firstAt > 15 * 60 * 1000) failedOwnerLogins.delete(ipKey);
    const owner = readOwner();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!owner || owner.email !== email || !verifySecret(password, owner.password_hash)) {
      const state = failedOwnerLogins.get(ipKey) || { count: 0, firstAt: now };
      state.count += 1;
      if (state.count >= 8) state.blockedUntil = now + 15 * 60 * 1000;
      failedOwnerLogins.set(ipKey, state);
      return res.status(state.blockedUntil ? 429 : 401).json({ error: state.blockedUntil ? 'Muitas tentativas de acesso ao proprietário. Aguarde 15 minutos.' : 'E-mail ou senha do proprietário inválidos.' });
    }
    failedOwnerLogins.delete(ipKey);
    const token = crypto.randomBytes(32).toString('hex');
    ownerSessions.set(token, { email, createdAt: now });
    res.json({ success: true, token, owner: { email } });
  });

  app.post('/api/owner/logout', (req, res) => {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (token) ownerSessions.delete(token);
    res.json({ success: true });
  });

  app.get('/api/owner/billing', (req, res) => {
    if (!ownerAuthorized(req)) return res.status(401).json({ error: 'Sessão do proprietário inválida.' });
    const companies = new Map(storage.getCompanies().map(company => [company.id, company]));
    const subscriptions = storage.getBillingSubscriptions().map(sub => ({ ...sub, company_name: companies.get(sub.company_id)?.trade_name || companies.get(sub.company_id)?.corporate_name || 'Empresa removida' }));
    res.json({ configured: Boolean(process.env.ASAAS_API_KEY && process.env.ASAAS_WEBHOOK_TOKEN), environment: process.env.ASAAS_ENVIRONMENT === 'production' ? 'production' : 'sandbox', plans: Object.values(BILLING_PLANS).map(plan => ({ id: plan.id, name: plan.name, price_cents: plan.priceCents, max_employees: plan.maxEmployees })), subscriptions });
  });

  app.get('/api/owner/companies', (req, res) => {
    if (!ownerAuthorized(req)) return res.status(401).json({ error: 'Sessão do proprietário inválida.' });
    res.json(storage.getCompanies());
  });

  app.patch('/api/owner/companies/:id/status', (req, res) => {
    if (!ownerAuthorized(req)) return res.status(401).json({ error: 'Sessão do proprietário inválida.' });
    const active = req.body.active;
    if (typeof active !== 'boolean') return res.status(400).json({ error: 'Informe o status ativo da empresa.' });
    const targetCompany = storage.getCompanyById(req.params.id);
    if (!targetCompany) return res.status(404).json({ error: 'Empresa não encontrada.' });
    if (!storage.setCompanyActive(req.params.id, active)) return res.status(404).json({ error: 'Empresa não encontrada.' });
    storage.addAuditLog({
      id: `audit-${crypto.randomUUID()}`, company_id: targetCompany.id, user_id: 'saas-owner',
      user_name: readOwner()?.email || 'Proprietário PontoPro', user_role: 'saas_owner',
      action: active ? 'COMPANY_REACTIVATED' : 'COMPANY_SUSPENDED', target_type: 'company', target_id: targetCompany.id,
      details: { active }, ip_address: req.ip || '127.0.0.1', created_at: new Date().toISOString(),
    });
    res.json({ success: true, company: storage.getCompanyById(req.params.id) });
  });

  app.post('/api/owner/companies', (req, res) => {
    if (!ownerAuthorized(req)) return res.status(401).json({ error: 'Sessão do proprietário inválida.' });
    const corporateName = String(req.body.corporate_name || '').trim();
    const tradeName = String(req.body.trade_name || corporateName).trim();
    const cnpj = normalizeCnpj(String(req.body.cnpj || ''));
    const contactEmail = String(req.body.contact_email || '').trim().toLowerCase();
    const adminName = String(req.body.admin_name || '').trim();
    const adminEmail = String(req.body.admin_email || '').trim().toLowerCase();
    const adminPassword = String(req.body.admin_password || '');
    const establishmentName = String(req.body.establishment_name || tradeName).trim();
    const radiusMeters = Number(req.body.radius_meters || 150);
    const latitude = Number.isFinite(Number(req.body.latitude)) ? Number(req.body.latitude) : 0;
    const longitude = Number.isFinite(Number(req.body.longitude)) ? Number(req.body.longitude) : 0;
    if (!corporateName || !isValidCnpj(cnpj) || !/^\S+@\S+\.\S+$/.test(contactEmail) || !adminName || !/^\S+@\S+\.\S+$/.test(adminEmail) || adminPassword.length < 12 || !Number.isFinite(radiusMeters) || radiusMeters < 25 || radiusMeters > 10000 || !String(req.body.address || '').trim()) {
      return res.status(400).json({ error: 'Preencha os dados da empresa, informe um CNPJ válido, endereço/CEP, e-mail do administrador e senha com pelo menos 12 caracteres.' });
    }
    if (storage.getCompanies().some(c => normalizeCnpj(c.cnpj) === cnpj)) return res.status(409).json({ error: 'Já existe uma empresa cadastrada com esse CNPJ.' });
    if (storage.getAllEmployees().some(e => e.email.toLowerCase() === adminEmail)) return res.status(409).json({ error: 'Este e-mail já está associado a um usuário.' });
    const companyId = `comp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const license = issuePerpetualLicense({ clientName: corporateName, clientCnpj: cnpj, maxCompanies: 1, maxEmployees: 1000, hardwareLockId: `PONTOPRO-${companyId}` });
    const selectedPlan = planIdFrom(req.body.plan) || 'prata';
    const company = { id: companyId, cnpj, corporate_name: corporateName, trade_name: tradeName, contact_email: contactEmail, active: true, license_key: license.key, created_at: now, plan: BILLING_PLANS[selectedPlan].name as 'Prata' | 'Ouro' | 'Diamante', billing_required: true };
    const establishmentId = `est-${crypto.randomUUID()}`;
    const establishment = { id: establishmentId, company_id: companyId, code: 'MATRIZ', name: establishmentName, cnpj, address: String(req.body.address).trim(), timezone: 'America/Sao_Paulo', latitude, longitude, radius_meters: radiusMeters, active: true };
    const scheduleId = `sched-${crypto.randomUUID()}`;
    const schedule = { id: scheduleId, company_id: companyId, name: 'Jornada padrão', type: 'standard_44h' as const, weekly_hours: 44, daily_expected_hours: 8, entry_time: '08:00', lunch_start_time: '12:00', lunch_end_time: '13:00', exit_time: '17:00', tolerance_minutes: 10, night_shift_enabled: false };
    const admin = {
      id: `usr-${crypto.randomUUID()}`, company_id: companyId, establishment_id: establishmentId,
      name: adminName, email: adminEmail, cpf: '', pis_nis: '', matricula: `ADMIN-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      department: 'Administração', position: 'Administrador da empresa', work_schedule_id: scheduleId,
      role: 'company_admin' as const, biometric_registered: false, active: true, created_at: now, password_hash: hashSecret(adminPassword),
    };
    const auditLog = { id: `audit-${crypto.randomUUID()}`, company_id: companyId, user_id: 'saas-owner', user_name: readOwner()?.email || 'Proprietário PontoPro', user_role: 'saas_owner' as const, action: 'COMPANY_CREATED', target_type: 'company', target_id: companyId, details: { company: corporateName, admin_email: adminEmail }, ip_address: req.ip || '127.0.0.1', created_at: now };
    try {
      storage.createCompanyBundle(company, establishment, schedule, admin, auditLog);
    } catch (error) {
      return res.status(409).json({ error: error instanceof Error ? error.message : 'Não foi possível cadastrar a empresa.' });
    }
    res.status(201).json({ success: true, company, administrator: { name: admin.name, email: admin.email, matricula: admin.matricula }, temporary_setup_note: 'Configure o endereço e as coordenadas reais da filial antes de habilitar registros de ponto.' });
  });

  app.get('/api/auth/profiles', (_req, res) => {
    res.status(410).json({ error: 'A seleção de perfis de demonstração foi removida.' });
  });

  app.get('/api/auth/me', (req, res) => {
    const employee = authenticatedEmployee(req);
    if (!employee) {
      return res.status(401).json({ error: 'Usuário não encontrado ou sessão expirada' });
    }
    const company = storage.getCompanyById(employee.company_id);
    if (!company || !company.active) return res.status(403).json({ error: 'A empresa está suspensa ou indisponível. Contate o proprietário do PontoPro.' });
    const establishment = storage
      .getEstablishments(employee.company_id)
      .find((e) => e.id === employee.establishment_id);

    res.json({
      employee: publicEmployee(employee),
      company: publicCompany(company),
      establishment,
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const ipKey = String(req.ip || 'unknown');
    const now = Date.now();
    const attempts = failedLogins.get(ipKey);
    if (attempts?.blockedUntil && attempts.blockedUntil > now) {
      return res.status(429).json({ error: 'Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.' });
    }
    if (attempts && now - attempts.firstAt > 15 * 60 * 1000) failedLogins.delete(ipKey);
    const { identifier, password, mode } = req.body;
    if (!identifier || !String(identifier).trim()) {
      return res.status(400).json({ error: mode === 'employee' ? 'Informe sua matrícula.' : 'Informe seu usuário.' });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const cleanDigits = cleanId.replace(/\D/g, '');
    const allEmps = storage.getAllEmployees();
    const employee = mode === 'employee'
      ? allEmps.find((e) => e.matricula.trim().toLowerCase() === cleanId && e.role === 'employee')
      : allEmps.find((e) => e.email.toLowerCase() === cleanId && ['company_admin', 'manager', 'auditor'].includes(e.role));

    if (!employee || !verifySecret(String(password || ''), mode === 'employee' ? employee.pin_hash : employee.password_hash)) {
      const state = failedLogins.get(ipKey) || { count: 0, firstAt: now };
      state.count += 1;
      if (state.count >= 8) state.blockedUntil = now + 15 * 60 * 1000;
      failedLogins.set(ipKey, state);
      return res.status(state.blockedUntil ? 429 : 401).json({ error: state.blockedUntil ? 'Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.' : 'Credenciais inválidas. Confira sua matrícula/e-mail e sua senha/PIN.' });
    }
    failedLogins.delete(ipKey);

    if (!employee.active) {
      return res.status(403).json({ error: 'Conta de acesso inativa. Contate o RH da sua unidade.' });
    }

    const company = storage.getCompanyById(employee.company_id);
    if (!company || !company.active) return res.status(403).json({ error: 'A empresa está suspensa ou indisponível. Contate o proprietário do PontoPro.' });
    if (process.env.BILLING_ENFORCEMENT_ENABLED === 'true' && company.billing_required && employee.role !== 'company_admin' && storage.getBillingSubscriptionByCompany(company.id)?.status !== 'active') {
      return res.status(402).json({ error: 'A assinatura desta empresa não está ativa. O administrador principal precisa regularizar o pagamento.', code: 'SUBSCRIPTION_REQUIRED' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    userSessions.set(token, { userId: employee.id, createdAt: Date.now() });
    const establishment = storage
      .getEstablishments(employee.company_id)
      .find((e) => e.id === employee.establishment_id);

    storage.addAuditLog({
      id: `audit-${Date.now()}`,
      company_id: employee.company_id,
      user_id: employee.id,
      user_name: employee.name,
      user_role: employee.role,
      action: 'USER_LOGIN',
      target_type: 'auth_session',
      target_id: employee.id,
      details: { identifier, role: employee.role, method: 'individual_credentials' },
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      token,
      employee: publicEmployee(employee),
      company: publicCompany(company),
      establishment,
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = bearerToken(req);
    const session = token ? userSessions.get(token) : undefined;
    const employee = session ? storage.getEmployeeById(session.userId) : undefined;
    if (token) userSessions.delete(token);

    if (employee) {
      storage.addAuditLog({
        id: `audit-${Date.now()}`,
        company_id: employee.company_id,
        user_id: employee.id,
        user_name: employee.name,
        user_role: employee.role,
        action: 'USER_LOGOUT',
        target_type: 'auth_session',
        target_id: employee.id,
        details: { role: employee.role, reason: 'user_signout' },
        ip_address: req.ip || '127.0.0.1',
        created_at: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
  });

  // Every data endpoint requires a server-issued bearer session. User IDs supplied by the browser are never authentication.
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/owner/') || req.path === '/auth/login' || req.path === '/auth/profiles' || req.path === '/owner/setup-status' || req.path === '/owner/setup') return next();
    if (req.path === '/auth/logout') {
      const employee = authenticatedEmployee(req);
      if (!employee) return res.status(401).json({ error: 'Sessão inválida ou expirada. Entre novamente.' });
      res.locals.authEmployee = employee;
      return next();
    }
    const employee = authenticatedEmployee(req);
    if (!employee) return res.status(401).json({ error: 'Sessão inválida ou expirada. Entre novamente.' });
    res.locals.authEmployee = employee;
    const requestedCompany = String(req.query.companyId || req.body?.company_id || req.body?.companyId || '');
    if (requestedCompany && requestedCompany !== employee.company_id) return res.status(403).json({ error: 'Acesso negado: os dados pertencem a outra empresa.' });
    if (process.env.BILLING_ENFORCEMENT_ENABLED === 'true') {
      const company = storage.getCompanyById(employee.company_id);
      if (company?.billing_required) {
        const subscription = storage.getBillingSubscriptionByCompany(company.id);
        const billingRoute = req.path.startsWith('/billing/');
        if (!billingRoute && subscription?.status !== 'active') return res.status(402).json({ error: 'Assinatura não ativa. Acesse Plano e Cobrança para concluir ou regularizar o pagamento.', code: 'SUBSCRIPTION_REQUIRED' });
        if (billingRoute && employee.role !== 'company_admin') return res.status(403).json({ error: 'Somente o administrador principal pode gerenciar a assinatura.' });
      }
    }
    if (employee.role === 'employee') {
      if (req.method !== 'GET' && req.path !== '/punches' && req.path !== '/sync/batch' && req.path !== '/corrections' && req.path !== '/auth/logout') {
        return res.status(403).json({ error: 'Funcionários não têm permissão para esta operação.' });
      }
      if (req.path.startsWith('/reports/') || req.path === '/audit-logs' || req.path === '/license/activate') return res.status(403).json({ error: 'Permissão administrativa necessária.' });
      if (req.body?.employee_id && req.body.employee_id !== employee.id) return res.status(403).json({ error: 'Você só pode registrar ponto para sua própria matrícula.' });
      if (req.body?.items && Array.isArray(req.body.items) && req.body.items.some((item: any) => item.employee_id !== employee.id)) return res.status(403).json({ error: 'A fila offline contém registros de outro funcionário.' });
    }
    if (employee.role === 'auditor' && req.method !== 'GET') return res.status(403).json({ error: 'O perfil auditor tem acesso somente para leitura.' });
    if (req.path === '/license/status' && employee.role !== 'company_admin') return res.status(403).json({ error: 'Somente o administrador principal pode consultar a licença da empresa.' });
    const isCompanyAdmin = employee.role === 'company_admin';
    const isManager = employee.role === 'manager';
    const isManagement = isCompanyAdmin || isManager;
    if (req.path === '/establishments' && req.method !== 'GET' && !isCompanyAdmin) return res.status(403).json({ error: 'Somente o administrador principal pode gerenciar filiais.' });
    if (req.path === '/employees' && req.method !== 'GET' && !isManagement) return res.status(403).json({ error: 'Permissão de gestão de funcionários necessária.' });
    if (req.path === '/employees' && req.method === 'POST' && req.body?.role === 'company_admin' && !isCompanyAdmin) return res.status(403).json({ error: 'Somente o administrador principal pode criar outro administrador.' });
    if (req.path.startsWith('/employees/') && req.method !== 'GET' && !isCompanyAdmin) return res.status(403).json({ error: 'Somente o administrador principal pode alterar credenciais e configurações de funcionários.' });
    if (req.path.startsWith('/corrections/') && req.method !== 'GET' && !isManagement) return res.status(403).json({ error: 'Permissão de gestor necessária para revisar correções.' });
    if ((req.path.startsWith('/reports/') || req.path === '/audit-logs') && !['company_admin', 'manager', 'auditor'].includes(employee.role)) return res.status(403).json({ error: 'Permissão administrativa necessária.' });
    if (req.path === '/license/activate') return res.status(403).json({ error: 'A ativação de licença é exclusiva do proprietário do PontoPro.' });
    if (req.path === '/punches' && req.method === 'POST' && req.body?.employee_id !== employee.id) return res.status(403).json({ error: 'Uma marcação só pode ser enviada pela própria sessão do funcionário.' });
    if (req.path === '/sync/batch' && req.body?.items && Array.isArray(req.body.items) && req.body.items.some((item: any) => item.employee_id !== employee.id)) return res.status(403).json({ error: 'A sincronização só pode conter marcações da própria sessão autenticada.' });
    next();
  });

  // -------------------------------------------------------------
  // BILLING / SUBSCRIPTIONS (Asaas)
  // -------------------------------------------------------------
  app.get('/api/billing/subscription', (req, res) => {
    const user = res.locals.authEmployee as Employee;
    if (user.role !== 'company_admin') return res.status(403).json({ error: 'Somente o administrador principal pode gerenciar a assinatura.' });
    const company = storage.getCompanyById(user.company_id);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada.' });
    const subscription = storage.getBillingSubscriptionByCompany(company.id);
    const plan = planForCompany(company);
    res.json({ plan: { id: plan.id, name: plan.name, price_cents: plan.priceCents, max_employees: plan.maxEmployees }, subscription: subscription || null, billing_configured: Boolean(process.env.ASAAS_API_KEY && process.env.ASAAS_WEBHOOK_TOKEN), enforcement_enabled: process.env.BILLING_ENFORCEMENT_ENABLED === 'true', environment: process.env.ASAAS_ENVIRONMENT === 'production' ? 'production' : 'sandbox' });
  });

  app.post('/api/billing/subscription', async (req, res) => {
    const user = res.locals.authEmployee as Employee;
    if (user.role !== 'company_admin') return res.status(403).json({ error: 'Somente o administrador principal pode contratar ou alterar o plano.' });
    const company = storage.getCompanyById(user.company_id);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada.' });
    if (!process.env.ASAAS_API_KEY || !process.env.ASAAS_WEBHOOK_TOKEN) return res.status(503).json({ error: 'Cobrança não ativada. Configure as credenciais Asaas e o token do webhook no servidor.' });
    const planId = planIdFrom(req.body.plan);
    if (!planId) return res.status(400).json({ error: 'Plano inválido. Escolha Prata, Ouro ou Diamante.' });
    const existing = storage.getBillingSubscriptionByCompany(company.id);
    if (existing && ['pending', 'active', 'past_due', 'canceling'].includes(existing.status)) return res.status(409).json({ error: 'Já existe uma assinatura em andamento. Cancele ou regularize a atual antes de criar outra.' });
    const billingType = String(req.body.billing_type || 'BOLETO').toUpperCase();
    if (billingType !== 'BOLETO') return res.status(400).json({ error: 'Nesta etapa, a cobrança recorrente está configurada para boleto. Cartão exige fluxo seguro de captura de dados do titular e será habilitado após implementação e homologação específicas.' });
    if (billingCreationLocks.has(company.id)) return res.status(409).json({ error: 'Já existe uma solicitação de assinatura em processamento. Aguarde e atualize a tela.' });
    billingCreationLocks.add(company.id);
    try {
      const existingCustomers = await asaasRequest(`/customers?cpfCnpj=${encodeURIComponent(normalizeCnpj(company.cnpj))}&limit=10`);
      let customer = Array.isArray(existingCustomers.data) ? existingCustomers.data.find((item: any) => normalizeCnpj(String(item.cpfCnpj || '')) === normalizeCnpj(company.cnpj)) : undefined;
      if (!customer) customer = await asaasRequest('/customers', { method: 'POST', body: JSON.stringify({ name: company.corporate_name, cpfCnpj: normalizeCnpj(company.cnpj), email: company.contact_email, externalReference: company.id }) });
      const plan = BILLING_PLANS[planId];
      const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const remote = await asaasRequest('/subscriptions', { method: 'POST', body: JSON.stringify({ customer: customer.id, billingType, nextDueDate: dueDate, value: plan.priceCents / 100, cycle: 'MONTHLY', description: `PontoPro ${plan.name} - ${company.trade_name}`, externalReference: `${company.id}:${plan.id}` }) });
      let checkoutUrl: string | undefined;
      try {
        const payments = await asaasRequest(`/subscriptions/${encodeURIComponent(String(remote.id))}/payments?limit=10`);
        const firstPayment = Array.isArray(payments.data) ? payments.data[0] : undefined;
        checkoutUrl = firstPayment?.invoiceUrl || firstPayment?.bankSlipUrl;
      } catch (paymentLookupError) { console.warn('[Billing] Assinatura criada; link da primeira cobrança ainda não foi recuperado:', paymentLookupError); }
      const now = new Date().toISOString();
      const record: BillingSubscription = { id: `bill-${crypto.randomUUID()}`, company_id: company.id, plan_id: planId, status: 'pending', provider: 'asaas', provider_customer_id: String(customer.id), provider_subscription_id: String(remote.id), next_due_date: String(remote.nextDueDate || dueDate), current_period_end: String(remote.nextDueDate || dueDate), checkout_url: checkoutUrl, created_at: now, updated_at: now };
      storage.upsertBillingSubscription(record);
      return res.status(201).json({ subscription: record, payment_url: checkoutUrl || null, message: checkoutUrl ? 'Assinatura criada. Conclua a primeira cobrança pelo link do provedor.' : 'Assinatura criada. Consulte a primeira cobrança no painel Asaas; o acesso pago só será ativado após confirmação por webhook.' });
    } catch (error) {
      console.error('[Billing] Não foi possível criar assinatura Asaas:', error);
      return res.status(502).json({ error: error instanceof Error ? error.message : 'Não foi possível criar a assinatura no provedor.' });
    } finally {
      billingCreationLocks.delete(company.id);
    }
  });

  app.post('/api/billing/subscription/cancel', async (req, res) => {
    const user = res.locals.authEmployee as Employee;
    if (user.role !== 'company_admin') return res.status(403).json({ error: 'Somente o administrador principal pode cancelar a assinatura.' });
    const subscription = storage.getBillingSubscriptionByCompany(user.company_id);
    if (!subscription || !subscription.provider_subscription_id || !['pending', 'active', 'past_due', 'canceling'].includes(subscription.status)) return res.status(404).json({ error: 'Não existe assinatura ativa para cancelar.' });
    try {
      await asaasRequest(`/subscriptions/${encodeURIComponent(subscription.provider_subscription_id)}`, { method: 'PUT', body: JSON.stringify({ status: 'INACTIVE' }) });
      const updated: BillingSubscription = { ...subscription, status: 'canceling', updated_at: new Date().toISOString() };
      storage.upsertBillingSubscription(updated);
      return res.json({ success: true, subscription: updated, message: 'Cancelamento solicitado ao provedor. O estado final será confirmado pelo webhook.' });
    } catch (error) {
      console.error('[Billing] Falha ao cancelar assinatura:', error);
      return res.status(502).json({ error: error instanceof Error ? error.message : 'Não foi possível cancelar a assinatura.' });
    }
  });

  // -------------------------------------------------------------
  // COMPANIES & ESTABLISHMENTS
  // -------------------------------------------------------------
  app.get('/api/companies', (req, res) => {
    const user = res.locals.authEmployee as Employee;
    res.json(storage.getCompanies().filter((company) => company.id === user.company_id).map(publicCompany));
  });

  app.get('/api/establishments', (req, res) => {
    const user = res.locals.authEmployee as Employee;
    const companyId = user.company_id;
    res.json(storage.getEstablishments(companyId));
  });

  app.post('/api/establishments', (req, res) => {
    const { company_id, code, name, cnpj, address, latitude, longitude, radius_meters } = req.body;
    const authenticatedUser = res.locals.authEmployee as Employee;
    if (company_id !== authenticatedUser.company_id) return res.status(403).json({ error: 'Não é permitido cadastrar filiais em outra empresa.' });
    if (!company_id || !String(name || '').trim() || !isValidCnpj(String(cnpj || '')) || !String(address || '').trim() || latitude === undefined || longitude === undefined || !Number.isFinite(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90 || !Number.isFinite(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180 || (radius_meters !== undefined && (!Number.isFinite(Number(radius_meters)) || Number(radius_meters) < 25 || Number(radius_meters) > 10000))) {
      return res.status(400).json({ error: 'Informe nome, CNPJ válido, endereço completo, coordenadas reais e cerca virtual entre 25 e 10.000 metros.' });
    }
    const newEst = {
      id: `est-${crypto.randomUUID()}`,
      company_id,
      code: code || `FILIAL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      name: String(name).trim(),
      cnpj: normalizeCnpj(String(cnpj)),
      address: String(address).trim(),
      timezone: 'America/Sao_Paulo',
      latitude: Number(latitude),
      longitude: Number(longitude),
      radius_meters: Number(radius_meters) || 150,
      active: true,
    };
    storage.addEstablishment(newEst);
    res.json(newEst);
  });

  // -------------------------------------------------------------
  // EMPLOYEES & WORK SCHEDULES
  // -------------------------------------------------------------
  app.get('/api/employees', (req, res) => {
    const user = res.locals.authEmployee as Employee;
    const companyId = user.company_id;
    const employees = user.role === 'employee' ? [user] : storage.getEmployees(companyId);
    res.json(employees.map(publicEmployee));
  });

  app.post('/api/employees', (req, res) => {
    const {
      company_id,
      establishment_id,
      name,
      email,
      cpf,
      pis_nis,
      matricula,
      department,
      position,
      work_schedule_id,
      role,
      pin,
    } = req.body;

    const authenticatedUser = res.locals.authEmployee as Employee;
    if (company_id !== authenticatedUser.company_id) return res.status(403).json({ error: 'Não é permitido cadastrar usuários em outra empresa.' });
    if (!['employee', 'manager', 'company_admin'].includes(String(role || 'employee'))) return res.status(400).json({ error: 'Perfil de acesso inválido.' });
    if (role === 'company_admin' && authenticatedUser.role !== 'company_admin') return res.status(403).json({ error: 'Somente o administrador principal pode criar outro administrador.' });
    const minimumCredentialLength = role === 'employee' ? 6 : 12;
    if (!name || !company_id || !pin || String(pin).length < minimumCredentialLength || (role === 'employee' && (!cpf || !pis_nis || !matricula))) {
      return res.status(400).json({ error: role === 'employee' ? 'Informe nome, PIN com pelo menos 6 caracteres e CPF, PIS/NIS e matrícula.' : 'Para perfis administrativos, use uma senha com pelo menos 12 caracteres.' });
    }
    const company = storage.getCompanyById(company_id);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada.' });
    if ((role || 'employee') === 'employee') {
      const activeEmployees = storage.getEmployees(company_id).filter(item => item.role === 'employee' && item.active).length;
      const plan = planForCompany(company);
      if (!canAddEmployee(activeEmployees, plan.id)) return res.status(409).json({ error: `O plano ${plan.name} permite até ${plan.maxEmployees} funcionários ativos. Faça upgrade do plano para cadastrar mais funcionários.`, code: 'PLAN_EMPLOYEE_LIMIT_REACHED', plan: plan.id, max_employees: plan.maxEmployees });
    }
    if (storage.getEmployees(company_id).some(e => (matricula && e.matricula.toLowerCase() === String(matricula).toLowerCase()) || (email && e.email.toLowerCase() === String(email).toLowerCase()))) return res.status(409).json({ error: 'Já existe usuário com esta matrícula ou e-mail na empresa.' });
    const chosenEstablishment = establishment_id || storage.getEstablishments(company_id)[0]?.id;
    const chosenSchedule = work_schedule_id || storage.getWorkSchedules(company_id)[0]?.id;
    if (!chosenEstablishment || !storage.getEstablishments(company_id).some(e => e.id === chosenEstablishment) || !chosenSchedule || !storage.getWorkSchedules(company_id).some(sc => sc.id === chosenSchedule)) return res.status(400).json({ error: 'Configure uma filial e uma jornada válidas para esta empresa.' });

    const newEmp: Employee = {
      id: `emp-${crypto.randomUUID()}`,
      company_id,
      establishment_id: chosenEstablishment,
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@empresa.com.br`,
      cpf,
      pis_nis,
      matricula: matricula || `MAT-${Math.floor(Math.random() * 9000 + 1000)}`,
      department: department || 'Operações',
      position: position || 'Colaborador',
      work_schedule_id: chosenSchedule,
      role: role || 'employee',
      biometric_registered: false,
      active: true,
      created_at: new Date().toISOString(),
      ...(role && role !== 'employee' ? { password_hash: hashSecret(String(pin)) } : { pin_hash: hashSecret(String(pin)) }),
    };

    storage.addEmployee(newEmp);
    res.json(publicEmployee(newEmp));
  });

  app.post('/api/employees/:id/biometrics', (req, res) => {
    // Never mark a fake template ID as biometric enrollment. WebAuthn/passkey support must
    // verify a real browser credential and server-side challenge before enabling this route.
    const user = res.locals.authEmployee as Employee;
    const target = storage.getEmployeeById(req.params.id);
    if (!target || target.company_id !== user.company_id) return res.status(404).json({ error: 'Funcionário não encontrado nesta empresa.' });
    return res.status(501).json({ error: 'Cadastro biométrico real ainda não está habilitado. O sistema não registrará biometria simulada. Use a autenticação por matrícula e PIN até a integração WebAuthn ser validada.' });
  });

  app.get('/api/schedules', (req, res) => {
    const user = res.locals.authEmployee as Employee;
    const companyId = user.company_id;
    const schedules = storage.getWorkSchedules(companyId);
    res.json(user.role === 'employee' ? schedules.filter((s) => s.id === user.work_schedule_id) : schedules);
  });

  // -------------------------------------------------------------
  // PUNCH REGISTRATION & INTEGRITY (Portaria 671 REP-P)
  // -------------------------------------------------------------
  app.get('/api/punches', (req, res) => {
    const user = res.locals.authEmployee as Employee;
    const companyId = user.company_id;
    const requestedEmployeeId = req.query.employeeId as string | undefined;
    if (user.role === 'employee' && requestedEmployeeId && requestedEmployeeId !== user.id) return res.status(403).json({ error: 'Acesso negado aos registros de outro funcionário.' });
    const employeeId = user.role === 'employee' ? user.id : requestedEmployeeId;
    const events = storage.getTimeEvents(companyId, employeeId);
    res.json(events);
  });

  app.get('/api/receipts/:employeeId', (req, res) => {
    const user = res.locals.authEmployee as Employee;
    if (user.role === 'employee' && req.params.employeeId !== user.id) return res.status(403).json({ error: 'Acesso negado.' });
    const target = storage.getEmployeeById(req.params.employeeId);
    if (!target || target.company_id !== user.company_id) return res.status(404).json({ error: 'Funcionário não encontrado.' });
    const receipts = storage.getReceipts(req.params.employeeId);
    res.json(receipts);
  });

  app.post('/api/punches', (req, res) => {
    const {
      employee_id,
      company_id,
      establishment_id,
      event_type,
      occurred_at,
      latitude,
      longitude,
      accuracy_meters,
      biometric_verified,
      biometric_score,
      biometric_photo,
      device_id,
      idempotency_key,
      is_offline,
    } = req.body;

    if (!employee_id || !company_id || !event_type) {
      return res.status(400).json({ error: 'Dados obrigatórios para marcação ausentes.' });
    }
    if (typeof biometric_photo !== 'string' || !biometric_photo.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Foto obrigatória ausente ou inválida. Capture a foto antes de marcar o ponto.' });
    }
    if (req.body.location_permission_granted !== true) {
      return res.status(403).json({ error: 'A permissão de localização deve ser concedida antes da marcação.' });
    }

    const employee = storage.getEmployeeById(employee_id);
    const company = storage.getCompanyById(company_id);
    if (!employee || !company) {
      return res.status(404).json({ error: 'Empresa ou Empregado não encontrados.' });
    }
    if (employee.company_id !== company_id) {
      return res.status(403).json({ error: 'O funcionário não pertence à empresa informada.' });
    }
    const allowedEventTypes = ['entry', 'exit', 'lunch_start', 'lunch_end', 'overtime_start', 'overtime_end'];
    if (!allowedEventTypes.includes(event_type)) {
      return res.status(400).json({ error: 'Tipo de marcação inválido.' });
    }
    // Online records use server time to prevent client-clock manipulation. Offline sync preserves the original device timestamp.
    const eventTime = is_offline ? occurred_at : new Date().toISOString();
    const eventTimestamp = new Date(eventTime || '').getTime();
    if (!eventTime || !Number.isFinite(eventTimestamp) || eventTimestamp > Date.now() + 10 * 60 * 1000) {
      return res.status(400).json({ error: 'Data e hora da marcação são inválidas ou estão no futuro.' });
    }
    if (typeof idempotency_key !== 'string' || idempotency_key.length < 8 || idempotency_key.length > 200) {
      return res.status(400).json({ error: 'Chave de idempotência obrigatória e válida para evitar marcações duplicadas.' });
    }

    // Check idempotency
    const existingEvents = storage.getTimeEvents(company_id);
    const existing = existingEvents.find((e) => e.idempotency_key === idempotency_key);
    if (existing) {
      const receipt = storage.getReceipts(employee_id).find((r) => r.nsr === existing.nsr);
      return res.json({
        event: existing,
        receipt,
        message: 'Marcação previamente registrada (idempotência atendida).',
      });
    }

    // Evaluate geofence
    const establishments = storage.getEstablishments(company_id);
    const est = establishments.find((e) => e.id === establishment_id);
    if (!est) {
      return res.status(400).json({ error: 'Estabelecimento inválido para a empresa informada.' });
    }
    const geo = evaluateGeofence({
      employeeLat: latitude !== undefined && latitude !== null ? Number(latitude) : undefined,
      employeeLon: longitude !== undefined && longitude !== null ? Number(longitude) : undefined,
      establishmentLat: est.latitude,
      establishmentLon: est.longitude,
      radiusMeters: est.radius_meters,
    });

    const nsr = storage.getNextNsr(company_id);
    const previousHash = storage.getLatestHash(company_id);
    const receivedTime = new Date().toISOString();

    const sha256_hash = computeEventHash({
      previousHash,
      nsr,
      companyCnpj: company.cnpj,
      employeeCpf: employee.cpf,
      occurredAt: eventTime,
      eventType: event_type,
    });

    const newEvent: TimeEvent = {
      id: `evt-${Date.now()}-${nsr}`,
      nsr,
      company_id,
      establishment_id: est.id,
      employee_id,
      event_type: event_type as EventType,
      occurred_at: eventTime,
      received_at: receivedTime,
      is_offline: !!is_offline,
      sync_status: 'synced',
      device_id: device_id || 'BROWSER_CLIENT',
      latitude: latitude !== undefined && latitude !== null ? Number(latitude) : undefined,
      longitude: longitude !== undefined && longitude !== null ? Number(longitude) : undefined,
      accuracy_meters: accuracy_meters ? Number(accuracy_meters) : undefined,
      location_status: geo.status,
      biometric_verified: !!biometric_verified,
      biometric_score: biometric_score !== undefined && biometric_score !== null ? Number(biometric_score) : undefined,
      biometric_photo,
      sha256_hash,
      previous_hash: previousHash,
      idempotency_key: idempotency_key || `IDEM-${Date.now()}-${Math.random()}`,
    };

    const receipt = generatePunchReceipt(newEvent, company, employee);
    storage.addTimeEvent(newEvent, receipt);

    // Audit log
    storage.addAuditLog({
      id: `audit-${Date.now()}`,
      company_id,
      user_id: employee.id,
      user_name: employee.name,
      user_role: employee.role,
      action: 'PUNCH_EVENT_RECORDED',
      target_type: 'time_event',
      target_id: String(nsr),
      details: {
        nsr,
        event_type,
        location_status: geo.status,
        biometric_verified: !!biometric_verified,
      },
      ip_address: req.ip || '127.0.0.1',
      created_at: receivedTime,
    });

    res.json({
      success: true,
      event: newEvent,
      receipt,
      location_evaluation: geo,
    });
  });

  // -------------------------------------------------------------
  // OFFLINE BATCH SYNCHRONIZATION
  // -------------------------------------------------------------
  app.post('/api/sync/batch', (req, res) => {
    const { company_id, items } = req.body;
    if (!company_id || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Lote de sincronização inválido.' });
    }

    const company = storage.getCompanyById(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    const existingEvents = storage.getTimeEvents(company_id);
    const existingKeys = new Set<string>(existingEvents.map((e) => e.idempotency_key));

    const batchCheck = processSyncBatch(items, existingKeys);

    let successfullyStored = 0;
    const storedEvents: TimeEvent[] = [];
    const errors = [...batchCheck.errors];
    const resolvedKeys = new Set<string>();

    // Existing records and repeated keys in this batch are safe to remove from the local queue.
    for (const item of items) {
      const key = typeof item?.idempotency_key === 'string' ? item.idempotency_key : '';
      if (key && existingKeys.has(key)) resolvedKeys.add(key);
    }

    const acceptedKeys = new Set(batchCheck.acceptedKeys);
    const handledBatchKeys = new Set<string>();
    for (const item of items) {
      const key = typeof item?.idempotency_key === 'string' ? item.idempotency_key : '';
      if (!key || !acceptedKeys.has(key) || handledBatchKeys.has(key)) {
        continue;
      }
      // Handle one item per idempotency key. Never store duplicate entries from one batch.
      handledBatchKeys.add(key);

      const emp = storage.getEmployeeById(item.employee_id);
      const offlineTimestamp = new Date(String(item.occurred_at || '')).getTime();
      if (!Number.isFinite(offlineTimestamp) || offlineTimestamp > Date.now() + 10 * 60 * 1000) {
        errors.push({ idempotency_key: item.idempotency_key, reason: 'Horário offline inválido ou no futuro; registro mantido na fila local.' });
        continue;
      }
      if (!emp || emp.company_id !== company_id) {
        errors.push({ idempotency_key: item.idempotency_key, reason: 'Funcionário não encontrado nesta empresa.' });
        continue;
      }
      const companyEstablishments = storage.getEstablishments(company_id);
      const establishment = companyEstablishments.find((entry) => entry.id === item.establishment_id) || companyEstablishments[0];
      if (item.company_id !== company_id || !establishment || (item.establishment_id && !companyEstablishments.some((entry) => entry.id === item.establishment_id))) {
        errors.push({ idempotency_key: item.idempotency_key, reason: 'Empresa ou estabelecimento do registro não corresponde ao lote.' });
        continue;
      }
      const allowedEventTypes = ['entry', 'exit', 'lunch_start', 'lunch_end', 'overtime_start', 'overtime_end'];
      if (!allowedEventTypes.includes(item.event_type)) {
        errors.push({ idempotency_key: item.idempotency_key, reason: 'Tipo de marcação inválido.' });
        continue;
      }
      if (typeof item.biometric_photo !== 'string' || !item.biometric_photo.startsWith('data:image/')) {
        errors.push({ idempotency_key: item.idempotency_key, reason: 'Foto obrigatória ausente ou inválida; registro mantido na fila local.' });
        continue;
      }
      if (item.location_permission_granted !== true) {
        errors.push({ idempotency_key: item.idempotency_key, reason: 'Permissão de localização não confirmada; registro mantido na fila local.' });
        continue;
      }

      const geo = evaluateGeofence({
        employeeLat: item.latitude !== undefined && item.latitude !== null ? Number(item.latitude) : undefined,
        employeeLon: item.longitude !== undefined && item.longitude !== null ? Number(item.longitude) : undefined,
        establishmentLat: establishment.latitude,
        establishmentLon: establishment.longitude,
        radiusMeters: establishment.radius_meters,
      });
      const nsr = storage.getNextNsr(company_id);
      const previousHash = storage.getLatestHash(company_id);
      const receivedTime = new Date().toISOString();

      const sha256_hash = computeEventHash({
        previousHash,
        nsr,
        companyCnpj: company.cnpj,
        employeeCpf: emp.cpf,
        occurredAt: item.occurred_at,
        eventType: item.event_type,
      });

      const newEvt: TimeEvent = {
        id: `evt-sync-${crypto.randomUUID()}`,
        nsr,
        company_id,
        establishment_id: establishment.id,
        employee_id: item.employee_id,
        event_type: item.event_type as EventType,
        occurred_at: item.occurred_at, // Preserves original offline timestamp
        received_at: receivedTime,
        is_offline: true,
        sync_status: 'synced',
        device_id: item.device_id || 'OFFLINE_PWA',
        latitude: item.latitude,
        longitude: item.longitude,
        accuracy_meters: item.accuracy_meters,
        location_status: geo.status,
        biometric_verified: item.biometric_verified,
        biometric_score: item.biometric_score,
        biometric_photo: item.biometric_photo,
        sha256_hash,
        previous_hash: previousHash,
        idempotency_key: item.idempotency_key,
      };

      const receipt = generatePunchReceipt(newEvt, company, emp);
      storage.addTimeEvent(newEvt, receipt);
      storedEvents.push(newEvt);
      successfullyStored++;
      resolvedKeys.add(item.idempotency_key);
    }

    res.json({
      processed: successfullyStored,
      duplicatesIgnored: batchCheck.duplicatesIgnored,
      errors,
      resolvedKeys: [...resolvedKeys],
      events: storedEvents,
    });
  });

  // -------------------------------------------------------------
  // CORRECTIONS & JUSTIFICATIONS
  // -------------------------------------------------------------
  app.get('/api/corrections', (req, res) => {
    const user = res.locals.authEmployee as Employee;
    const companyId = user.company_id;
    const requests = storage.getCorrectionRequests(companyId);
    res.json(user.role === 'employee' ? requests.filter((item) => item.employee_id === user.id) : requests);
  });

  app.post('/api/corrections', (req, res) => {
    const { company_id, employee_id, requested_date, requested_time, requested_event_type, reason, attachment_name } = req.body;
    const requester = res.locals.authEmployee as Employee;
    const targetEmployee = storage.getEmployeeById(employee_id);
    if (company_id !== requester.company_id || !targetEmployee || targetEmployee.company_id !== requester.company_id) return res.status(403).json({ error: 'A solicitação precisa pertencer a um funcionário da sua empresa.' });
    if (!company_id || !employee_id || !requested_date || !requested_time || !reason) {
      return res.status(400).json({ error: 'Campos obrigatórios da solicitação ausentes.' });
    }

    const newReq = {
      id: `corr-${crypto.randomUUID()}`,
      company_id,
      employee_id,
      requested_date,
      requested_time,
      requested_event_type: requested_event_type || 'entry',
      reason,
      attachment_name,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
    };

    storage.addCorrectionRequest(newReq);
    res.json(newReq);
  });

  app.put('/api/corrections/:id/review', (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status de revisão inválido.' });
    }

    const reviewer = res.locals.authEmployee as Employee;
    const targetRequest = storage.getCorrectionRequests(reviewer.company_id).find((item) => item.id === id);
    if (!targetRequest) return res.status(404).json({ error: 'Solicitação de correção não encontrada nesta empresa.' });
    const updated = storage.reviewCorrectionRequest(id, status, reviewer.id, notes);
    if (!updated) {
      return res.status(404).json({ error: 'Solicitação de correção não encontrada.' });
    }

    res.json(updated);
  });

  app.post('/api/corrections/batch-approve', (req, res) => {
    const { ids, notes } = req.body;
    const reviewer = res.locals.authEmployee as Employee;
    const companyId = reviewer.company_id;
    const allInCompany = storage.getCorrectionRequests(companyId);
    const targetIds = ids && Array.isArray(ids) && ids.length > 0
      ? ids
      : allInCompany.filter((c) => c.status === 'pending').map((c) => c.id);

    const updatedItems = [];
    for (const id of targetIds) {
      const upd = storage.reviewCorrectionRequest(
        id,
        'approved',
        reviewer.id,
        notes || 'Aprovação rápida em 1 clique via Ações Rápidas'
      );
      if (upd) updatedItems.push(upd);
    }

    res.json({
      success: true,
      count: updatedItems.length,
      updated: updatedItems,
    });
  });

  // -------------------------------------------------------------
  // REGULATORY REPORTS & AFD EXPORT (Portaria MTP 671/2021)
  // -------------------------------------------------------------
  app.get('/api/reports/afd', (req, res) => {
    const user = res.locals.authEmployee as Employee;
    const companyId = user.company_id;
    const company = storage.getCompanyById(companyId);
    if (!company) {
      return res.status(404).send('Empresa não encontrada');
    }

    const events = storage.getTimeEvents(companyId);
    const enrichedEvents = events.map((ev) => ({
      event: ev,
      employee: storage.getEmployeeById(ev.employee_id)!,
    })).filter((x) => x.employee);

    const afdText = generateAfdContent({
      company,
      events: enrichedEvents,
      startDate: new Date('2026-01-01'),
      endDate: new Date(),
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="AFD_${normalizeCnpj(company.cnpj)}_${Date.now()}.txt"`);
    res.send(afdText);
  });

  app.get('/api/reports/technical-term', (req, res) => {
    const user = res.locals.authEmployee as Employee;
    const companyId = user.company_id;
    const company = storage.getCompanyById(companyId);
    if (!company) {
      return res.status(404).send('Empresa não encontrada');
    }
    const term = getTechnicalTerm(company);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(term);
  });

  // -------------------------------------------------------------
  // COMMERCIAL PERPETUAL LICENSE (Venda Única)
  // -------------------------------------------------------------
  app.get('/api/license/status', (req, res) => {
    const user = res.locals.authEmployee as Employee;
    const company = storage.getCompanyById(user.company_id);
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada.' });
    const license = storage.getLicense();
    res.json({ ...license, key: company.license_key, client_name: company.corporate_name, client_cnpj: company.cnpj, max_companies: 1, max_employees: 1000, current_companies: 1, current_employees: storage.getEmployees(company.id).length, hardware_lock_id: `PONTOPRO-${company.id}`, status: company.active ? 'active' : 'suspended' });
  });

  app.post('/api/license/activate', (req, res) => {
    const { key, cnpj } = req.body;
    if (!key || !cnpj) {
      return res.status(400).json({ error: 'Chave e CNPJ são obrigatórios.' });
    }
    const result = storage.activateLicense(key, cnpj);
    res.json(result);
  });

  // -------------------------------------------------------------
  // AUDIT LOGS
  // -------------------------------------------------------------
  app.get('/api/audit-logs', (req, res) => {
    const user = res.locals.authEmployee as Employee;
    res.json(storage.getAuditLogs(user.company_id));
  });

  // -------------------------------------------------------------
  // VITE DEV SERVER INTEGRATION
  // -------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    if (!fs.existsSync(path.join(distDir, 'index.html'))) {
      throw new Error('Build de produção não encontrado. Execute npm run build antes de iniciar com NODE_ENV=production.');
    }
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PontoPro] ${process.env.NODE_ENV === 'production' ? 'Production' : 'Development'} server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[PontoPro] Server failed to start:', err);
  process.exit(1);
});
