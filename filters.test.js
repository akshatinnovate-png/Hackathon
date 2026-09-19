import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_FILTERS, applyFilters, isFiltering } from './filters.js';
import { createTask } from './taskModel.js';

const make = (title, extra = {}) => ({ ...createTask({ title, ...extra }, extra.created ?? 1), ...extra });
const tasks = [
  make('Buy milk', { priority: 'low', created: 1 }),
  make('Write report', { priority: 'high', created: 2, due: '2026-10-01', notes: 'quarterly numbers' }),
  make('Call Sam', { priority: 'medium', created: 3, done: true, due: '2026-09-20' }),
  make('Plan trip', { priority: 'high', created: 4 }),
];
const f = (patch) => ({ ...DEFAULT_FILTERS, ...patch });
const titles = (list) => list.map((t) => t.title);

describe('applyFilters', () => {
  it('returns everything by default, in order', () => {
    assert.deepEqual(titles(applyFilters(tasks, DEFAULT_FILTERS)), ['Buy milk', 'Write report', 'Call Sam', 'Plan trip']);
  });
  it('does not mutate its input', () => {
    const copy = [...tasks];
    applyFilters(tasks, f({ sort: 'newest' }));
    assert.deepEqual(tasks, copy);
  });
  it('filters by status', () => {
    assert.deepEqual(titles(applyFilters(tasks, f({ status: 'completed' }))), ['Call Sam']);
    assert.equal(applyFilters(tasks, f({ status: 'active' })).length, 3);
  });
  it('filters by priority', () => {
    assert.deepEqual(titles(applyFilters(tasks, f({ priority: 'high' }))), ['Write report', 'Plan trip']);
  });
  it('searches titles and notes, case-insensitively', () => {
    assert.deepEqual(titles(applyFilters(tasks, f({ query: 'MILK' }))), ['Buy milk']);
    assert.deepEqual(titles(applyFilters(tasks, f({ query: 'quarterly' }))), ['Write report']);
    assert.deepEqual(applyFilters(tasks, f({ query: 'nothing here' })), []);
  });
  it('combines filters', () => {
    assert.deepEqual(titles(applyFilters(tasks, f({ status: 'active', priority: 'high', query: 'plan' }))), ['Plan trip']);
  });
  it('sorts by newest', () => {
    assert.equal(applyFilters(tasks, f({ sort: 'newest' }))[0].title, 'Plan trip');
  });
  it('sorts by priority then age', () => {
    assert.deepEqual(titles(applyFilters(tasks, f({ sort: 'priority' }))), ['Write report', 'Plan trip', 'Call Sam', 'Buy milk']);
  });
  it('sorts by due date with undated tasks last', () => {
    assert.deepEqual(titles(applyFilters(tasks, f({ sort: 'due' }))), ['Call Sam', 'Write report', 'Buy milk', 'Plan trip']);
  });
  it('falls back to manual order for an unknown sort', () => {
    assert.equal(applyFilters(tasks, f({ sort: 'bogus' }))[0].title, 'Buy milk');
  });
});

describe('isFiltering', () => {
  it('is false for defaults and whitespace-only queries', () => {
    assert.equal(isFiltering(DEFAULT_FILTERS), false);
    assert.equal(isFiltering(f({ query: '   ' })), false);
  });
  it('is true when anything narrows the list', () => {
    assert.equal(isFiltering(f({ status: 'active' })), true);
    assert.equal(isFiltering(f({ priority: 'low' })), true);
    assert.equal(isFiltering(f({ query: 'x' })), true);
  });
});
