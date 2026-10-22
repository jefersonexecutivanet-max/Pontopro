import test from 'node:test';
import assert from 'node:assert/strict';
import {
  diffInMinutes,
  isNightTime,
  calculateNightMinutes,
  applyCltTolerance,
  pairEvents,
  calculateDailySummary,
  formatMinutes,
} from './time-calc';
import { TimeEvent, WorkSchedule } from '../types';

test('diffInMinutes correctly computes difference', () => {
  const d1 = new Date('2026-10-21T08:00:00Z');
  const d2 = new Date('2026-10-21T12:00:00Z');
  assert.equal(diffInMinutes(d1, d2), 240);
});

test('isNightTime accurately identifies 22:00 to 05:00 window', () => {
  const night1 = new Date('2026-10-21T22:30:00');
  const night2 = new Date('2026-10-21T03:15:00');
  const day1 = new Date('2026-10-21T10:00:00');
  const day2 = new Date('2026-10-21T21:59:00');

  assert.equal(isNightTime(night1), true);
  assert.equal(isNightTime(night2), true);
  assert.equal(isNightTime(day1), false);
  assert.equal(isNightTime(day2), false);
});

test('calculateNightMinutes applies reduced legal hour factor (hora ficta)', () => {
  // 60 minutes real worked between 23:00 and 00:00
  const start = new Date('2026-10-21T23:00:00');
  const end = new Date('2026-10-22T00:00:00');
  const night = calculateNightMinutes(start, end);
  // 60 * (60 / 52.5) = ~69 minutes
  assert.equal(night, 69);
});

test('applyCltTolerance applies Art. 58 CLT 10 min daily tolerance', () => {
  const expected = 480; // 8 hours
  // 485 minutes (+5 min variance) -> rounded to expected 480
  assert.equal(applyCltTolerance(485, expected), 480);
  // 475 minutes (-5 min variance) -> rounded to expected 480
  assert.equal(applyCltTolerance(475, expected), 480);
  // 500 minutes (+20 min variance > 10 min tolerance) -> returns actual 500
  assert.equal(applyCltTolerance(500, expected), 500);
});

test('pairEvents handles standard 4-punch day (Entrada, Almoço Saída, Retorno, Saída)', () => {
  const mockEvents: TimeEvent[] = [
    {
      id: '1',
      nsr: 1,
      company_id: 'c1',
      establishment_id: 'e1',
      employee_id: 'emp1',
      event_type: 'entry',
      occurred_at: '2026-10-21T08:00:00',
      received_at: '2026-10-21T08:00:05',
      is_offline: false,
      sync_status: 'synced',
      device_id: 'dev1',
      location_status: 'within_fence',
      biometric_verified: true,
      sha256_hash: 'hash1',
      previous_hash: '000',
      idempotency_key: 'k1',
    },
    {
      id: '2',
      nsr: 2,
      company_id: 'c1',
      establishment_id: 'e1',
      employee_id: 'emp1',
      event_type: 'lunch_start',
      occurred_at: '2026-10-21T12:00:00',
      received_at: '2026-10-21T12:00:05',
      is_offline: false,
      sync_status: 'synced',
      device_id: 'dev1',
      location_status: 'within_fence',
      biometric_verified: true,
      sha256_hash: 'hash2',
      previous_hash: 'hash1',
      idempotency_key: 'k2',
    },
    {
      id: '3',
      nsr: 3,
      company_id: 'c1',
      establishment_id: 'e1',
      employee_id: 'emp1',
      event_type: 'lunch_end',
      occurred_at: '2026-10-21T13:00:00',
      received_at: '2026-10-21T13:00:05',
      is_offline: false,
      sync_status: 'synced',
      device_id: 'dev1',
      location_status: 'within_fence',
      biometric_verified: true,
      sha256_hash: 'hash3',
      previous_hash: 'hash2',
      idempotency_key: 'k3',
    },
    {
      id: '4',
      nsr: 4,
      company_id: 'c1',
      establishment_id: 'e1',
      employee_id: 'emp1',
      event_type: 'exit',
      occurred_at: '2026-10-21T17:00:00',
      received_at: '2026-10-21T17:00:05',
      is_offline: false,
      sync_status: 'synced',
      device_id: 'dev1',
      location_status: 'within_fence',
      biometric_verified: true,
      sha256_hash: 'hash4',
      previous_hash: 'hash3',
      idempotency_key: 'k4',
    },
  ];

  const { workMinutes, lunchMinutes } = pairEvents(mockEvents);
  assert.equal(workMinutes, 480); // 4h morning + 4h afternoon = 8h
  assert.equal(lunchMinutes, 60);  // 1h lunch
});

test('calculateDailySummary identifies overtime and formatMinutes shows signs', () => {
  const schedule: WorkSchedule = {
    id: 's1',
    company_id: 'c1',
    name: 'Comercial 44h',
    type: 'standard_44h',
    weekly_hours: 44,
    daily_expected_hours: 8,
    entry_time: '08:00',
    lunch_start_time: '12:00',
    lunch_end_time: '13:00',
    exit_time: '17:00',
    tolerance_minutes: 10,
    night_shift_enabled: false,
  };

  const mockEvents: TimeEvent[] = [
    {
      id: '1',
      nsr: 1,
      company_id: 'c1',
      establishment_id: 'e1',
      employee_id: 'emp1',
      event_type: 'entry',
      occurred_at: '2026-10-21T08:00:00',
      received_at: '2026-10-21T08:00:05',
      is_offline: false,
      sync_status: 'synced',
      device_id: 'dev1',
      location_status: 'within_fence',
      biometric_verified: true,
      sha256_hash: 'hash1',
      previous_hash: '000',
      idempotency_key: 'k1',
    },
    {
      id: '2',
      nsr: 2,
      company_id: 'c1',
      establishment_id: 'e1',
      employee_id: 'emp1',
      event_type: 'exit',
      occurred_at: '2026-10-21T18:00:00', // 10h worked continuous (2h overtime)
      received_at: '2026-10-21T18:00:05',
      is_offline: false,
      sync_status: 'synced',
      device_id: 'dev1',
      location_status: 'within_fence',
      biometric_verified: true,
      sha256_hash: 'hash2',
      previous_hash: 'hash1',
      idempotency_key: 'k2',
    },
  ];

  const summary = calculateDailySummary('2026-10-21', 'emp1', mockEvents, schedule, false);
  assert.equal(summary.worked_minutes, 600); // 10 hours
  assert.equal(summary.expected_minutes, 480); // 8 hours
  assert.equal(summary.overtime_50_minutes, 120); // 2 hours
  assert.equal(formatMinutes(summary.balance_minutes, true), '+02:00');
});
