import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clamp, createRng, formatDuration, isValidISODate, plural, todayISO } from './utils.js';

describe('utils', () => {
  it('clamp', () => {
    assert.equal(clamp(5, 0, 3), 3);
    assert.equal(clamp(-1, 0, 3), 0);
    assert.equal(clamp(2, 0, 3), 2);
  });
  it('isValidISODate rejects impossible dates', () => {
    assert.equal(isValidISODate('2026-09-19'), true);
    assert.equal(isValidISODate('2026-02-30'), false);
    assert.equal(isValidISODate('2026-9-1'), false);
    assert.equal(isValidISODate(20260919), false);
    assert.equal(isValidISODate('2024-02-29'), true);
  });
  it('todayISO uses the local calendar day', () => {
    assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(todayISO(new Date(2026, 0, 5, 23, 59).getTime()), '2026-01-05');
  });
  it('formatDuration', () => {
    assert.equal(formatDuration(25 * 60000), '25 min');
    assert.equal(formatDuration(60 * 60000), '1 h');
    assert.equal(formatDuration(95 * 60000), '1 h 35 min');
  });
  it('plural', () => {
    assert.equal(plural(1, 'task'), '1 task');
    assert.equal(plural(0, 'task'), '0 tasks');
  });
  it('createRng is deterministic and in [0,1)', () => {
    const a = createRng(7);
    const b = createRng(7);
    for (let i = 0; i < 50; i++) {
      const v = a();
      assert.equal(v, b());
      assert.ok(v >= 0 && v < 1);
    }
  });
});
