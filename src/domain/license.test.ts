import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLicenseSignature,
  validateLicenseKey,
  issuePerpetualLicense,
} from './license';

test('validateLicenseKey checks structure and signature verification', () => {
  const cnpj = '12.345.678/0001-90';
  const key = 'PP-ABCD-EF12-3456-7890';
  const maxEmployees = 50;

  const validSig = computeLicenseSignature(key, cnpj, maxEmployees);

  // Check valid key
  const validResult = validateLicenseKey(key, cnpj, maxEmployees, validSig);
  assert.equal(validResult.isValid, true);

  // Check invalid format
  const badFormat = validateLicenseKey('INVALID-KEY', cnpj, maxEmployees, validSig);
  assert.equal(badFormat.isValid, false);
  assert.equal(badFormat.reason?.includes('Formato'), true);

  // Check signature mismatch (wrong CNPJ)
  const wrongCnpj = validateLicenseKey(key, '99.999.999/0001-99', maxEmployees, validSig);
  assert.equal(wrongCnpj.isValid, false);
  assert.equal(wrongCnpj.reason?.includes('controle interno'), true);
});

test('issuePerpetualLicense generates self-consistent perpetual license', () => {
  const license = issuePerpetualLicense({
    clientName: 'Indústria Metalúrgica Progresso S/A',
    clientCnpj: '45.123.456/0001-78',
    maxCompanies: 3,
    maxEmployees: 100,
    hardwareLockId: 'HW-NODE-88219-PROD',
  });

  assert.equal(license.is_perpetual, true);
  assert.equal(license.plan, 'single_purchase_pro');
  assert.equal(license.status, 'active');
  assert.equal(license.max_employees, 100);

  const check = validateLicenseKey(
    license.key,
    license.client_cnpj,
    license.max_employees,
    license.signature
  );
  assert.equal(check.isValid, true);
});
