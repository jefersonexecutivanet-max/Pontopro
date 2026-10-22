import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistanceMeters,
  evaluateGeofence,
  processSyncBatch,
  SyncItem,
} from './sync-engine';

test('calculateDistanceMeters accurately computes GPS distance', () => {
  // Avenida Paulista, SP: -23.56168, -46.65598
  // MASP: -23.56141, -46.65588
  // Distance is roughly ~30-40 meters
  const dist = calculateDistanceMeters(-23.56168, -46.65598, -23.56141, -46.65588);
  assert.equal(dist > 20 && dist < 50, true);
});

test('evaluateGeofence flags within and outside radius', () => {
  // Center: -23.56168, -46.65598, radius 100m
  const inside = evaluateGeofence({
    employeeLat: -23.56170,
    employeeLon: -23.56600,
    establishmentLat: -23.56168,
    establishmentLon: -23.56598,
    radiusMeters: 100,
  });
  assert.equal(inside.status, 'within_fence');

  // Far away (e.g. 5km away)
  const outside = evaluateGeofence({
    employeeLat: -23.60000,
    employeeLon: -23.60000,
    establishmentLat: -23.56168,
    establishmentLon: -23.56598,
    radiusMeters: 100,
  });
  assert.equal(outside.status, 'outside_fence');

  // Unavailable GPS
  const unavail = evaluateGeofence({
    employeeLat: undefined,
    employeeLon: undefined,
    establishmentLat: -23.56168,
    establishmentLon: -23.56598,
    radiusMeters: 100,
  });
  assert.equal(unavail.status, 'unavailable');
});

test('processSyncBatch rejects duplicates and retains idempotency', () => {
  const existingKeys = new Set<string>(['already-synced-123']);

  const nowIso = new Date().toISOString();
  const batch: SyncItem[] = [
    {
      idempotency_key: 'already-synced-123', // duplicate
      company_id: 'c1',
      establishment_id: 'e1',
      employee_id: 'emp1',
      event_type: 'entry',
      occurred_at: nowIso,
      device_id: 'd1',
      biometric_verified: true,
    },
    {
      idempotency_key: 'new-offline-punch-456', // valid new
      company_id: 'c1',
      establishment_id: 'e1',
      employee_id: 'emp1',
      event_type: 'exit',
      occurred_at: nowIso,
      device_id: 'd1',
      biometric_verified: true,
    },
    {
      idempotency_key: 'new-offline-punch-456', // duplicate within same batch
      company_id: 'c1',
      establishment_id: 'e1',
      employee_id: 'emp1',
      event_type: 'exit',
      occurred_at: nowIso,
      device_id: 'd1',
      biometric_verified: true,
    },
  ];

  const res = processSyncBatch(batch, existingKeys);
  assert.equal(res.processed, 1);
  assert.equal(res.duplicatesIgnored, 2);
  assert.deepEqual(res.acceptedKeys, ['new-offline-punch-456']);
});


test('processSyncBatch rejects malformed timestamps', () => {
  const res = processSyncBatch([{
    idempotency_key: 'bad-date-1',
    company_id: 'c1',
    establishment_id: 'e1',
    employee_id: 'emp1',
    event_type: 'entry',
    occurred_at: 'not-a-date',
    device_id: 'd1',
    biometric_verified: false,
  }], new Set<string>());
  assert.equal(res.processed, 0);
  assert.equal(res.errors.length, 1);
  assert.match(res.errors[0].reason, /inválidas/i);
});
