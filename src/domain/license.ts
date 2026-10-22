/**
 * Single-Purchase (Venda Única) License Engine
 * Validates perpetual commercial licenses, client binding, and employee limits.
 */

import { computeSha256 } from '../utils/crypto';
import { LicenseStatus } from '../types';
import { normalizeCnpj } from '../utils/cnpj';

export const LICENSE_SALT = 'PONTOPRO_PERPETUAL_LIC_SECRET_2026';

/**
 * Computes an internal checksum for a license key (not a digital signature or security boundary).
 */
export function computeLicenseSignature(
  key: string,
  clientCnpj: string,
  maxEmployees: number
): string {
  const cleanCnpj = normalizeCnpj(clientCnpj);
  const payload = `${key}|${cleanCnpj}|${maxEmployees}|${LICENSE_SALT}`;
  return computeSha256(payload).slice(0, 32).toUpperCase();
}

/**
 * Validates format and checksum of a license key
 */
export function validateLicenseKey(
  key: string,
  clientCnpj: string,
  maxEmployees: number,
  expectedSignature: string
): { isValid: boolean; reason?: string } {
  // Expected format: PP-XXXX-XXXX-XXXX-XXXX
  const pattern = /^PP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!pattern.test(key)) {
    return {
      isValid: false,
      reason: 'Formato de chave de licença inválido. O formato deve ser PP-XXXX-XXXX-XXXX-XXXX.',
    };
  }

  const computed = computeLicenseSignature(key, clientCnpj, maxEmployees);
  if (computed !== expectedSignature) {
    return {
      isValid: false,
      reason: 'O código de controle interno não confere para este CNPJ ou limite contratado.',
    };
  }

  return { isValid: true };
}

/**
 * Creates a valid perpetual single-purchase license bundle
 */
export function issuePerpetualLicense(params: {
  clientName: string;
  clientCnpj: string;
  maxCompanies: number;
  maxEmployees: number;
  hardwareLockId: string;
}): LicenseStatus {
  const segment = () => {
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const bytes = new Uint8Array(4);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
  };
  const segment1 = segment();
  const segment2 = segment();
  const segment3 = segment();
  const segment4 = segment();
  const key = `PP-${segment1}-${segment2}-${segment3}-${segment4}`;

  const signature = computeLicenseSignature(key, params.clientCnpj, params.maxEmployees);

  return {
    key,
    client_name: params.clientName,
    client_cnpj: params.clientCnpj,
    plan: 'single_purchase_pro',
    is_perpetual: true,
    status: 'active',
    max_companies: params.maxCompanies,
    max_employees: params.maxEmployees,
    current_companies: 1,
    current_employees: 0,
    activated_at: new Date().toISOString(),
    hardware_lock_id: params.hardwareLockId,
    signature,
  };
}
