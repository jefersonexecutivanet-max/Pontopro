-- ============================================================================
-- PONTOPRO - SISTEMA DE PONTO ELETRÔNICO PROFISSIONAL (REP-P)
-- DDL MIGRATION V1.0.0 (PostgreSQL 14+)
-- Compatível com Portaria MTP 671/2021 e LGPD (Lei 13.709/2018)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. COMPANIES (Empresas Empregadoras)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    corporate_name VARCHAR(150) NOT NULL,
    trade_name VARCHAR(150) NOT NULL,
    contact_email VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    license_key VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ESTABLISHMENTS (Filiais / Estabelecimentos)
CREATE TABLE IF NOT EXISTS establishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    cnpj VARCHAR(18) NOT NULL,
    address TEXT NOT NULL,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 150,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- 3. WORK SCHEDULES (Escalas e Jornadas de Trabalho)
CREATE TABLE IF NOT EXISTS work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('standard_44h', '6x1', '12x36', 'flexible', 'night_shift')),
    weekly_hours NUMERIC(4, 1) NOT NULL,
    daily_expected_hours NUMERIC(4, 1) NOT NULL,
    entry_time TIME NOT NULL,
    lunch_start_time TIME NOT NULL,
    lunch_end_time TIME NOT NULL,
    exit_time TIME NOT NULL,
    tolerance_minutes INTEGER DEFAULT 10,
    night_shift_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. USERS & EMPLOYEES
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('saas_owner', 'company_admin', 'manager', 'employee', 'auditor')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    establishment_id UUID NOT NULL REFERENCES establishments(id),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    pis_nis VARCHAR(14) NOT NULL,
    matricula VARCHAR(30) NOT NULL,
    department VARCHAR(50) NOT NULL,
    position VARCHAR(50) NOT NULL,
    work_schedule_id UUID NOT NULL REFERENCES work_schedules(id),
    role VARCHAR(30) NOT NULL DEFAULT 'employee',
    biometric_registered BOOLEAN DEFAULT FALSE,
    biometric_template_id VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, cpf),
    UNIQUE(company_id, matricula)
);

-- 5. TIME EVENTS (Eventos de Ponto - Registro Eletrônico Imutável)
CREATE TABLE IF NOT EXISTS time_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nsr BIGINT NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('entry', 'lunch_start', 'lunch_end', 'exit', 'overtime_start', 'overtime_end')),
    occurred_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    is_offline BOOLEAN DEFAULT FALSE,
    sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'flagged')),
    device_id VARCHAR(100) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    accuracy_meters NUMERIC(6, 1),
    location_status VARCHAR(30) DEFAULT 'within_fence' CHECK (location_status IN ('within_fence', 'outside_fence', 'unavailable')),
    biometric_verified BOOLEAN DEFAULT FALSE,
    biometric_score NUMERIC(5, 2),
    biometric_photo TEXT,
    sha256_hash CHAR(64) NOT NULL,
    previous_hash CHAR(64) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, nsr)
);

-- 6. PUNCH RECEIPTS (Comprovantes de Marcação - Portaria 671)
CREATE TABLE IF NOT EXISTS punch_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_event_id UUID NOT NULL REFERENCES time_events(id) ON DELETE RESTRICT,
    nsr BIGINT NOT NULL,
    company_cnpj VARCHAR(18) NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    employee_cpf VARCHAR(14) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    employee_pis VARCHAR(14) NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    signature TEXT NOT NULL,
    receipt_code VARCHAR(50) NOT NULL UNIQUE,
    inpi_registration VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SYNC BATCHES (Lotes de Sincronização Offline)
CREATE TABLE IF NOT EXISTS sync_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    device_id VARCHAR(100) NOT NULL,
    total_events INTEGER NOT NULL,
    successful_events INTEGER NOT NULL,
    duplicate_events INTEGER NOT NULL,
    error_count INTEGER NOT NULL,
    client_started_at TIMESTAMPTZ NOT NULL,
    server_processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CORRECTION REQUESTS (Solicitações de Ajuste / Justificativas)
CREATE TABLE IF NOT EXISTS correction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    original_event_id UUID REFERENCES time_events(id),
    requested_date DATE NOT NULL,
    requested_time TIME NOT NULL,
    requested_event_type VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    attachment_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT LOGS (Trilha de Auditoria e Conformidade)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID,
    user_name VARCHAR(100) NOT NULL,
    user_role VARCHAR(30) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. LICENSES (Licença Perpétua - Venda Única)
CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key VARCHAR(50) NOT NULL UNIQUE,
    client_name VARCHAR(150) NOT NULL,
    client_cnpj VARCHAR(18) NOT NULL,
    plan VARCHAR(50) DEFAULT 'single_purchase_pro',
    is_perpetual BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    max_companies INTEGER NOT NULL DEFAULT 5,
    max_employees INTEGER NOT NULL DEFAULT 100,
    hardware_lock_id VARCHAR(100) NOT NULL,
    signature TEXT NOT NULL,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    last_validated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. PRIVACY & LGPD AUDIT (Registros de Acesso a Dados Pessoais Sensíveis)
CREATE TABLE IF NOT EXISTS privacy_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    accessed_by_user_id UUID,
    target_employee_id UUID NOT NULL REFERENCES employees(id),
    data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('facial_biometrics', 'gps_coordinates', 'time_mirror', 'personal_cpf_pis')),
    legal_basis VARCHAR(100) NOT NULL, -- e.g. "Cumprimento de obrigação legal (Art. 7º, II c/c Art. 11, II, 'a' LGPD)"
    purpose TEXT NOT NULL,
    accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES PARA PERFORMANCE E CONFORMIDADE
CREATE INDEX IF NOT EXISTS idx_time_events_employee_occurred ON time_events(employee_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_time_events_company_nsr ON time_events(company_id, nsr);
CREATE INDEX IF NOT EXISTS idx_time_events_idempotency ON time_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_establishments_company ON establishments(company_id);
CREATE INDEX IF NOT EXISTS idx_correction_requests_employee ON correction_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id, created_at);
