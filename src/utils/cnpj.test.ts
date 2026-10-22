import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidCnpj, normalizeCnpj } from './cnpj';

test('normalizes formatted numeric CNPJ', () => {
  assert.equal(normalizeCnpj('11.222.333/0001-81'), '11222333000181');
});

test('validates numeric CNPJ and rejects invalid/repeated values', () => {
  assert.equal(isValidCnpj('11.222.333/0001-81'), true);
  assert.equal(isValidCnpj('11.222.333/0001-80'), false);
  assert.equal(isValidCnpj('00000000000000'), false);
});

test('supports alphanumeric CNPJ characters', () => {
  // The final two characters remain numeric; the check digits are computed from ASCII-48 values.
  assert.equal(isValidCnpj('AB12CD34EF5602'), true);
  assert.equal(isValidCnpj('AB12CD34EF5600'), false);
  assert.equal(normalizeCnpj('ab12.cd34/ef56-02'), 'AB12CD34EF5602');
});
