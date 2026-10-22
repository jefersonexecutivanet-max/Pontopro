import test from 'node:test';
import assert from 'node:assert/strict';
import { localDateKey } from './date';

test('localDateKey formats the calendar date without converting it to UTC', () => {
  const date = new Date(2026, 0, 9, 23, 30, 0);
  assert.equal(localDateKey(date), '2026-01-09');
});
