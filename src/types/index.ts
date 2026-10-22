/**
 * Type definitions for PontoPro Multi-tenant REP-P Time Tracking System
 */

export type UserRole = 'saas_owner' | 'company_admin' | 'manager' | 'employee' | 'auditor';

export type EventType = 
  | 'entry'         // Entrada
  | 'lunch_start'   // Saída Intervalo
  | 'lunch_end'     // Retorno Intervalo
  | 'exit'          // Saída
  | 'overtime_start'// Início Hora Extra
  | 'overtime_end'; // Fim Hora Extra

export type LocationStatus = 'within_fence' | 'outside_fence' | 'unavailable';

export interface Company {
  id: string;
  cnpj: string;
  corporate_name: string;
  trade_name: string;
  contact_email: string;
  active: boolean;
  license_key: string;
  created_at: string;
  plan?: 'Prata' | 'Ouro' | 'Diamante';
  billing_required?: boolean;
}

export interface Establishment {
  id: string;
  company_id: string;
  code: string;
  name: string;
  cnpj: string;
  address: string;
  timezone: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  active: boolean;
}

export interface WorkSchedule {
  id: string;
  company_id: string;
  name: string;
  type: 'standard_44h' | '6x1' | '12x36' | 'flexible' | 'night_shift';
  weekly_hours: number;
  daily_expected_hours: number;
  entry_time: string;       // e.g. "08:00"
  lunch_start_time: string; // e.g. "12:00"
  lunch_end_time: string;   // e.g. "13:00"
  exit_time: string;        // e.g. "17:00"
  tolerance_minutes: number;
  night_shift_enabled: boolean;
}

export interface Employee {
  id: string;
  company_id: string;
  establishment_id: string;
  name: string;
  email: string;
  cpf: string;
  pis_nis: string;
  matricula: string;
  department: string;
  position: string;
  work_schedule_id: string;
  role: UserRole;
  biometric_registered: boolean;
  biometric_template_id?: string;
  active: boolean;
  avatar_url?: string;
  created_at: string;
  /** Hash de credencial armazenado somente no servidor. */
  password_hash?: string;
  pin_hash?: string;
  /** Campo transitório enviado apenas no cadastro; o servidor persiste somente pin_hash. */
  pin?: string;
}

export interface TimeEvent {
  id: string;
  nsr: number; // Número Sequencial de Registro (Sequencial por empresa REP-P)
  company_id: string;
  establishment_id: string;
  employee_id: string;
  event_type: EventType;
  occurred_at: string; // Timestamp em que o empregado bateu o ponto
  received_at: string; // Timestamp de gravação no servidor
  is_offline: boolean;
  sync_status: 'synced' | 'pending' | 'flagged';
  device_id: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  location_status: LocationStatus;
  biometric_verified: boolean;
  biometric_score?: number;
  biometric_photo?: string;
  sha256_hash: string;
  previous_hash: string;
  idempotency_key: string;
}

export interface PunchReceipt {
  nsr: number;
  company_cnpj: string;
  company_name: string;
  employee_cpf: string;
  employee_name: string;
  employee_pis: string;
  event_type: EventType;
  occurred_at: string;
  received_at: string;
  sha256_hash: string;
  signature: string;
  receipt_code: string;
  inpi_registration: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  establishment_name?: string;
}

export interface CorrectionRequest {
  id: string;
  company_id: string;
  employee_id: string;
  original_event_id?: string;
  requested_date: string;
  requested_time: string;
  requested_event_type: EventType;
  reason: string;
  attachment_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

export interface DailySummary {
  date: string;
  employee_id: string;
  events: TimeEvent[];
  worked_minutes: number;
  expected_minutes: number;
  balance_minutes: number; // positivo = hora extra, negativo = atraso/falta
  overtime_50_minutes: number;
  overtime_100_minutes: number;
  night_shift_minutes: number; // com hora ficta reduzida
  lunch_break_minutes: number;
  status: 'complete' | 'incomplete' | 'absent' | 'day_off' | 'holiday';
}

export interface LicenseStatus {
  key: string;
  client_name: string;
  client_cnpj: string;
  plan: 'single_purchase_pro';
  is_perpetual: boolean;
  status: 'active' | 'suspended';
  max_companies: number;
  max_employees: number;
  current_companies: number;
  current_employees: number;
  activated_at: string;
  hardware_lock_id: string;
  signature: string;
}

export interface AuditLog {
  id: string;
  company_id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
  ip_address: string;
  created_at: string;
}
