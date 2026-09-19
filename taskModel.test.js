import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_TITLE_LENGTH } from './config.js';
import { applyPatch, computeStats, createTask, isOverdue, normalizeTask, sanitizeTitle, toggleDone, validateTitle } from './taskModel.js';

describe('validateTitle', () => {
  it('rejects empty and whitespace-only titles', () => {
    assert.equal(validateTitle('').ok, false);
    assert.equal(validateTitle('   \n\t ').ok, false);
    assert.equal(validateTitle(undefined).ok, false);
  });
  it('trims and collapses whitespace', () => {
    assert.deepEqual(validateTitle('  Ship   the\n demo '), { ok: true, value: 'Ship the demo' });
  });
  it('caps the length', () => {
    assert.equal(sanitizeTitle('x'.repeat(500)).length, MAX_TITLE_LENGTH);
  });
});

describe('createTask', () => {
  it('fills defaults', () => {
    const t = createTask({ title: 'A' }, 1000);
    assert.equal(t.priority, 'medium');
    assert.equal(t.done, false);
    assert.equal(t.created, 1000);
    assert.equal(t.due, null);
    assert.equal(t.focusMs, 0);
    assert.ok(t.id.length > 3);
  });
  it('ignores an unknown priority and an invalid date', () => {
    const t = createTask({ title: 'A', priority: 'urgent', due: '2026-02-31' });
    assert.equal(t.priority, 'medium');
    assert.equal(t.due, null);
  });
  it('creates unique ids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => createTask({ title: 'A' }).id));
    assert.equal(ids.size, 500);
  });
});

describe('normalizeTask', () => {
  it('rejects junk', () => {
    for (const v of [null, undefined, 5, 'x', [], {}, { title: '   ' }]) assert.equal(normalizeTask(v), null);
  });
  it('repairs bad fields instead of failing', () => {
    const t = normalizeTask({ title: 'ok', priority: 'nope', done: 1, created: -5, due: 'soon', focusMs: 'abc' }, 42);
    assert.equal(t.priority, 'medium');
    assert.equal(t.done, true);
    assert.equal(t.created, 42);
    assert.equal(t.due, null);
    assert.equal(t.focusMs, 0);
    assert.ok(t.completedAt > 0);
  });
  it('migrates the v1 shape (id, title, priority, done, created)', () => {
    const t = normalizeTask({ id: 'k1', title: 'Old', priority: 'high', done: false, created: 123 });
    assert.equal(t.id, 'k1');
    assert.equal(t.notes, '');
    assert.equal(t.due, null);
  });
});

describe('toggleDone / applyPatch', () => {
  it('toggles and records completion time', () => {
    const t = createTask({ title: 'A' });
    const done = toggleDone(t, 999);
    assert.equal(done.done, true);
    assert.equal(done.completedAt, 999);
    const again = toggleDone(done);
    assert.equal(again.done, false);
    assert.equal(again.completedAt, null);
    assert.equal(t.done, false, 'original is not mutated');
  });
  it('keeps the old title when the patch title is empty', () => {
    const t = createTask({ title: 'Keep' });
    assert.equal(applyPatch(t, { title: '   ' }).title, 'Keep');
  });
  it('clears the due date with null', () => {
    const t = createTask({ title: 'A', due: '2030-01-01' });
    assert.equal(applyPatch(t, { due: null }).due, null);
  });
});

describe('isOverdue and computeStats', () => {
  const today = '2026-09-19';
  it('flags only unfinished tasks with a past date', () => {
    assert.equal(isOverdue({ done: false, due: '2026-09-18' }, today), true);
    assert.equal(isOverdue({ done: false, due: '2026-09-19' }, today), false);
    assert.equal(isOverdue({ done: true, due: '2026-09-01' }, today), false);
    assert.equal(isOverdue({ done: false, due: null }, today), false);
  });
  it('counts everything', () => {
    const tasks = [
      { ...createTask({ title: 'a', priority: 'high', due: '2026-09-01' }) },
      { ...createTask({ title: 'b', priority: 'low' }), done: true, focusMs: 60000 },
      { ...createTask({ title: 'c', priority: 'low' }) },
    ];
    const s = computeStats(tasks, today);
    assert.deepEqual([s.total, s.done, s.pending, s.overdue, s.percent], [3, 1, 2, 1, 33]);
    assert.deepEqual(s.byPriority, { high: 1, medium: 0, low: 2 });
    assert.equal(s.focusMs, 60000);
  });
  it('handles an empty list', () => {
    const s = computeStats([], today);
    assert.deepEqual([s.total, s.percent, s.ratio], [0, 0, 0]);
  });
});
