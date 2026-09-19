import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEGACY_STORAGE_KEY, MAX_TASKS, SEED_TASKS, STORAGE_KEY } from './config.js';
import { buildSeedTasks, createMemoryBackend, createStorage, normalizeList, parseTasks, serializeTasks } from './storage.js';
import { createTask } from './taskModel.js';

describe('createStorage', () => {
  it('reports first run as null', () => {
    assert.deepEqual(createStorage(createMemoryBackend()).load(), { tasks: null, recovered: false });
  });
  it('round-trips tasks', () => {
    const storage = createStorage(createMemoryBackend());
    const tasks = [createTask({ title: 'A', due: '2030-05-05', notes: 'n' })];
    assert.equal(storage.save(tasks), true);
    assert.deepEqual(storage.load().tasks, tasks);
  });
  it('migrates the legacy v1 key', () => {
    const backend = createMemoryBackend();
    backend.setItem(LEGACY_STORAGE_KEY, JSON.stringify([{ id: 'a', title: 'Legacy', priority: 'high', done: true, created: 5 }]));
    const { tasks } = createStorage(backend).load();
    assert.equal(tasks[0].title, 'Legacy');
    assert.equal(tasks[0].notes, '');
    assert.equal(tasks[0].done, true);
  });
  it('recovers from corrupt data and keeps a copy', () => {
    const backend = createMemoryBackend();
    backend.setItem(STORAGE_KEY, '{not json');
    const result = createStorage(backend).load();
    assert.deepEqual(result, { tasks: [], recovered: true });
    assert.equal(backend.getItem(`${STORAGE_KEY}.corrupt`), '{not json');
  });
  it('returns false instead of throwing when the write fails', () => {
    const backend = { ...createMemoryBackend(), setItem() { throw new Error('QuotaExceededError'); } };
    assert.equal(createStorage(backend).save([]), false);
  });
  it('does not throw when reading fails', () => {
    const backend = { ...createMemoryBackend(), getItem() { throw new Error('SecurityError'); } };
    assert.deepEqual(createStorage(backend).load(), { tasks: null, recovered: false });
  });
  it('reports memory-only backends as not persistent', () => {
    assert.equal(createStorage(createMemoryBackend()).persistent, false);
    assert.equal(createStorage({ getItem: () => null, setItem() {}, removeItem() {} }).persistent, true);
  });
});

describe('normalizeList and parseTasks', () => {
  it('drops invalid items, fixes duplicate ids and caps the count', () => {
    const { tasks, skipped } = normalizeList([{ id: 'x', title: 'a' }, { id: 'x', title: 'b' }, null, { title: '' }]);
    assert.equal(tasks.length, 2);
    assert.equal(new Set(tasks.map((t) => t.id)).size, 2);
    assert.equal(skipped, 2);
    const many = normalizeList(Array.from({ length: MAX_TASKS + 20 }, (_, i) => ({ title: `t${i}` })));
    assert.equal(many.tasks.length, MAX_TASKS);
    assert.equal(many.skipped, 20);
  });
  it('round-trips through export and import', () => {
    const tasks = [createTask({ title: 'A' }), createTask({ title: 'B', priority: 'low' })];
    assert.deepEqual(parseTasks(serializeTasks(tasks)).tasks, tasks);
  });
  it('accepts a bare array', () => {
    assert.equal(parseTasks('[{"title":"x"}]').tasks.length, 1);
  });
  it('explains failures in plain language', () => {
    assert.throws(() => parseTasks('nope'), /not valid JSON/);
    assert.throws(() => parseTasks('{"a":1}'), /No task list/);
    assert.throws(() => parseTasks('[1,2,3]'), /None of the tasks/);
  });
  it('does not execute or keep unexpected fields', () => {
    const { tasks } = parseTasks('[{"title":"x","__proto__":{"polluted":true},"evil":"<img src=x onerror=alert(1)>"}]');
    assert.equal(tasks[0].evil, undefined);
    assert.equal({}.polluted, undefined);
  });
});

describe('buildSeedTasks', () => {
  it('creates the example tasks with sensible timestamps', () => {
    const tasks = buildSeedTasks(10_000_000);
    assert.equal(tasks.length, SEED_TASKS.length);
    assert.ok(tasks.every((t) => t.created < 10_000_000));
    assert.equal(tasks.filter((t) => t.done).length, SEED_TASKS.filter((s) => s.done).length);
  });
});
