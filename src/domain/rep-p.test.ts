import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEventHash,
  verifyEventIntegrity,
  generatePunchReceipt,
  formatAfdDateTime,
  generateAfdContent,
} from './rep-p';
import { Company, Employee, TimeEvent } from '../types';

test('computeEventHash produces deterministic SHA-256 digest', () => {
  const hash1 = computeEventHash({
    previousHash: '0'.repeat(64),
    nsr: 1,
    companyCnpj: '12.345.678/0001-90',
    employeeCpf: '123.456.789-00',
    occurredAt: '2026-10-21T08:00:00Z',
    eventType: 'entry',
  });

  const hash2 = computeEventHash({
    previousHash: '0'.repeat(64),
    nsr: 1,
    companyCnpj: '12.345.678/0001-90',
    employeeCpf: '123.456.789-00',
    occurredAt: '2026-10-21T08:00:00Z',
    eventType: 'entry',
  });

  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
});

test('verifyEventIntegrity catches tampering in time event', () => {
  const validHash = computeEventHash({
    previousHash: '0'.repeat(64),
    nsr: 1,
    companyCnpj: '12345678000190',
    employeeCpf: '12345678900',
    occurredAt: '2026-10-21T08:00:00Z',
    eventType: 'entry',
  });

  const event: TimeEvent = {
    id: 'e1',
    nsr: 1,
    company_id: 'c1',
    establishment_id: 'est1',
    employee_id: 'emp1',
    event_type: 'entry',
    occurred_at: '2026-10-21T08:00:00Z',
    received_at: '2026-10-21T08:00:05Z',
    is_offline: false,
    sync_status: 'synced',
    device_id: 'dev1',
    location_status: 'within_fence',
    biometric_verified: true,
    sha256_hash: validHash,
    previous_hash: '0'.repeat(64),
    idempotency_key: 'key1',
  };

  // Valid event
  assert.equal(verifyEventIntegrity(event, '12345678000190', '12345678900'), true);

  // Tampered event (e.g. employee changed occurred_at)
  const tamperedEvent = { ...event, occurred_at: '2026-10-21T07:55:00Z' };
  assert.equal(verifyEventIntegrity(tamperedEvent, '12345678000190', '12345678900'), false);
});

test('generatePunchReceipt creates an internal receipt without claiming a legal digital signature', () => {
  const company: Company = {
    id: 'c1',
    cnpj: '12.345.678/0001-90',
    corporate_name: 'Tech Corp Soluções Ltda',
    trade_name: 'Tech Corp',
    contact_email: 'contato@techcorp.com.br',
    active: true,
    license_key: 'PP-1234-5678-ABCD-EFGH',
    created_at: '2026-01-01',
  };

  const employee: Employee = {
    id: 'emp1',
    company_id: 'c1',
    establishment_id: 'est1',
    name: 'Carlos Alberto Silva',
    email: 'carlos@techcorp.com.br',
    cpf: '123.456.789-00',
    pis_nis: '123.45678.90-1',
    matricula: 'MAT-0042',
    department: 'TI',
    position: 'Engenheiro de Software',
    work_schedule_id: 's1',
    role: 'employee',
    biometric_registered: true,
    active: true,
    created_at: '2026-01-01',
  };

  const event: TimeEvent = {
    id: 'e1',
    nsr: 105,
    company_id: 'c1',
    establishment_id: 'est1',
    employee_id: 'emp1',
    event_type: 'entry',
    occurred_at: '2026-10-21T08:00:00Z',
    received_at: '2026-10-21T08:00:05Z',
    is_offline: false,
    sync_status: 'synced',
    device_id: 'dev1',
    location_status: 'within_fence',
    biometric_verified: true,
    sha256_hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    previous_hash: '000',
    idempotency_key: 'k1',
  };

  const receipt = generatePunchReceipt(event, company, employee);
  assert.equal(receipt.nsr, 105);
  assert.equal(receipt.company_name, 'Tech Corp Soluções Ltda');
  assert.equal(receipt.employee_cpf, '123.456.789-00');
  assert.equal(receipt.receipt_code.includes('000105'), true);
  assert.equal(receipt.signature.startsWith('HASH-INTERNO-'), true);
  assert.equal(receipt.signature.includes('ICP'), false);
});

test('generateAfdContent generates correct Header, Detail, and Trailer layout', () => {
  const company: Company = {
    id: 'c1',
    cnpj: '12.345.678/0001-90',
    corporate_name: 'Tech Corp Soluções Ltda',
    trade_name: 'Tech Corp',
    contact_email: 'contato@techcorp.com.br',
    active: true,
    license_key: 'PP-1234-5678-ABCD-EFGH',
    created_at: '2026-01-01',
  };

  const employee: Employee = {
    id: 'emp1',
    company_id: 'c1',
    establishment_id: 'est1',
    name: 'Carlos Alberto Silva',
    email: 'carlos@techcorp.com.br',
    cpf: '123.456.789-00',
    pis_nis: '12345678901',
    matricula: 'MAT-0042',
    department: 'TI',
    position: 'Engenheiro de Software',
    work_schedule_id: 's1',
    role: 'employee',
    biometric_registered: true,
    active: true,
    created_at: '2026-01-01',
  };

  const event: TimeEvent = {
    id: 'e1',
    nsr: 1,
    company_id: 'c1',
    establishment_id: 'est1',
    employee_id: 'emp1',
    event_type: 'entry',
    occurred_at: '2026-10-21T08:00:00Z',
    received_at: '2026-10-21T08:00:05Z',
    is_offline: false,
    sync_status: 'synced',
    device_id: 'dev1',
    location_status: 'within_fence',
    biometric_verified: true,
    sha256_hash: 'a'.repeat(64),
    previous_hash: '0'.repeat(64),
    idempotency_key: 'k1',
  };

  const afd = generateAfdContent({
    company,
    events: [{ event, employee }],
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
  });

  const lines = afd.split('\r\n');
  assert.equal(lines.length, 3); // Header, 1 Event, Trailer
  assert.equal(lines[0].startsWith('0000000001'), true); // Header
  assert.equal(lines[1].startsWith('0000000013'), true); // Tipo 3 detail
  assert.equal(lines[2].startsWith('9999999999000000001'), true); // Trailer with count 1
});


test('formatAfdDateTime always uses the Brazil timezone regardless of server timezone', () => {
  assert.deepEqual(formatAfdDateTime('2026-10-21T08:00:00.000Z'), { dateStr: '21102026', timeStr: '0500' });
});
