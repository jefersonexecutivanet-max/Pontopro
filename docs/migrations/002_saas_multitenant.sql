-- PontoPro SaaS multiempresa: PostgreSQL 14+
-- Migração de base para os módulos comerciais e de segurança.
-- Aplicar em banco de homologação, revisar com DBA e fazer backup antes de produção.
BEGIN;

CREATE TABLE IF NOT EXISTS saas_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  monthly_price_cents INTEGER NOT NULL CHECK (monthly_price_cents >= 0),
  max_employees INTEGER NOT NULL CHECK (max_employees > 0),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES saas_plans(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('trialing','active','past_due','suspended','cancelled')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  provider VARCHAR(40),
  provider_customer_id VARCHAR(150),
  provider_subscription_id VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company ON company_subscriptions(company_id, status);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash CHAR(64) NOT NULL UNIQUE,
  csrf_token_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active ON auth_sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS employee_pin_credentials (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until TIMESTAMPTZ,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key BYTEA NOT NULL,
  sign_count BIGINT NOT NULL DEFAULT 0,
  transports JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS company_evidence_policies (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  photo_mode VARCHAR(20) NOT NULL DEFAULT 'both' CHECK (photo_mode IN ('face','workplace','both')),
  require_location_permission BOOLEAN NOT NULL DEFAULT TRUE,
  retain_evidence_days INTEGER NOT NULL DEFAULT 365 CHECK (retain_evidence_days BETWEEN 1 AND 3650),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  requester_user_id UUID REFERENCES users(id),
  request_type VARCHAR(30) NOT NULL CHECK (request_type IN ('access','correction','deletion','portability','information','objection')),
  status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN ('received','in_progress','completed','rejected')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('info','low','medium','high','critical')),
  ip_address INET,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC);

INSERT INTO saas_plans(code, name, monthly_price_cents, max_employees, features)
VALUES
  ('starter', 'Inicial', 0, 10, '{"reports":true,"offline_sync":true}'::jsonb),
  ('professional', 'Profissional', 7900, 100, '{"reports":true,"offline_sync":true,"exports":true,"alerts":true}'::jsonb),
  ('scale', 'Escala', 19900, 500, '{"reports":true,"offline_sync":true,"exports":true,"alerts":true,"branches":true,"advanced_audit":true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

COMMIT;
