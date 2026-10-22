/**
 * Offline Sync & Geolocation Geofencing Engine
 * Handles idempotent batch synchronization and location distance calculations.
 */

import { LocationStatus } from '../types';

/**
 * Calculates geographical distance in meters between two coordinates using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Evaluates whether given coordinates fall within the establishment's authorized perimeter
 */
export function evaluateGeofence(params: {
  employeeLat?: number;
  employeeLon?: number;
  establishmentLat: number;
  establishmentLon: number;
  radiusMeters: number;
}): { status: LocationStatus; distanceMeters?: number } {
  if (params.employeeLat === undefined || params.employeeLon === undefined) {
    return { status: 'unavailable' };
  }

  const distance = calculateDistanceMeters(
    params.employeeLat,
    params.employeeLon,
    params.establishmentLat,
    params.establishmentLon
  );

  return {
    status: distance <= params.radiusMeters ? 'within_fence' : 'outside_fence',
    distanceMeters: distance,
  };
}

export interface SyncItem {
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
}

export interface SyncBatchResult {
  processed: number;
  duplicatesIgnored: number;
  errors: Array<{ idempotency_key: string; reason: string }>;
  acceptedKeys: string[];
}

/**
 * Validates a batch of offline sync punches against existing idempotency keys
 */
export function processSyncBatch(
  items: SyncItem[],
  existingKeys: Set<string>
): SyncBatchResult {
  const result: SyncBatchResult = {
    processed: 0,
    duplicatesIgnored: 0,
    errors: [],
    acceptedKeys: [],
  };

  const seenInBatch = new Set<string>();

  for (const item of items) {
    if (!item.idempotency_key) {
      result.errors.push({
        idempotency_key: 'missing',
        reason: 'Chave de idempotência obrigatória não fornecida.',
      });
      continue;
    }

    if (existingKeys.has(item.idempotency_key) || seenInBatch.has(item.idempotency_key)) {
      result.duplicatesIgnored++;
      continue;
    }

    if (!item.employee_id || !item.event_type || !item.occurred_at) {
      result.errors.push({
        idempotency_key: item.idempotency_key,
        reason: 'Dados obrigatórios do evento de ponto ausentes.',
      });
      continue;
    }

    // Verify timestamp sanity (cannot be in the far future)
    const eventTime = new Date(item.occurred_at).getTime();
    const now = Date.now();
    if (!Number.isFinite(eventTime)) {
      result.errors.push({
        idempotency_key: item.idempotency_key,
        reason: 'Data e hora do evento são inválidas.',
      });
      continue;
    }
    if (eventTime > now + 10 * 60 * 1000) { // 10 min clock skew margin
      result.errors.push({
        idempotency_key: item.idempotency_key,
        reason: 'Horário do evento não pode estar no futuro.',
      });
      continue;
    }

    seenInBatch.add(item.idempotency_key);
    result.acceptedKeys.push(item.idempotency_key);
    result.processed++;
  }

  return result;
}
