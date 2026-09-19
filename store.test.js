import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_TASKS } from './config.js';
import { createStore } from './store.js';
import { createTask } from './taskModel.js';

const seeded = () => createStore([createTask({ title: 'One' }), createTask({ title: 'Two', priority: 'high' })]);

describe('store: adding and editing', () => {
  it('adds a valid task and notifies subscribers', () => {
    const store = createStore();
    let calls = 0;
    store.subscribe(() => { calls += 1; });
    const result = store.addTask({ title: '  Hello  ', priority: 'high' });
    assert.equal(result.ok, true);
    assert.equal(store.getState().tasks[0].title, 'Hello');
    assert.equal(calls, 1);
  });
  it('rejects an empty title without changing state or notifying', () => {
    const store = createStore();
    let calls = 0;
    store.subscribe(() => { calls += 1; });
    const result = store.addTask({ title: '   ' });
    assert.equal(result.ok, false);
    assert.match(result.error, /title/i);
    assert.equal(store.getState().tasks.length, 0);
    assert.equal(calls, 0);
  });
  it('enforces the task limit', () => {
    const store = createStore(Array.from({ length: MAX_TASKS }, (_, i) => createTask({ title: `t${i}` })));
    assert.equal(store.addTask({ title: 'one too many' }).ok, false);
  });
  it('updates a task and refuses an empty new title', () => {
    const store = seeded();
    const id = store.getState().tasks[0].id;
    assert.equal(store.updateTask(id, { title: '' }).ok, false);
    assert.equal(store.updateTask(id, { title: 'Renamed', priority: 'low' }).ok, true);
    assert.equal(store.getState().tasks[0].title, 'Renamed');
    assert.equal(store.getState().tasks[0].priority, 'low');
    assert.equal(store.updateTask('missing', { title: 'x' }).ok, false);
  });
  it('toggles completion', () => {
    const store = seeded();
    const id = store.getState().tasks[0].id;
    assert.equal(store.toggleTask(id).done, true);
    assert.equal(store.toggleTask(id).done, false);
    assert.equal(store.toggleTask('missing'), null);
  });
  it('never mutates previous state objects', () => {
    const store = seeded();
    const before = store.getState();
    store.toggleTask(before.tasks[0].id);
    assert.equal(before.tasks[0].done, false);
    assert.notEqual(store.getState().tasks, before.tasks);
  });
});

describe('store: delete and undo', () => {
  it('removes and restores a task at its original position', () => {
    const store = seeded();
    const [first, second] = store.getState().tasks;
    store.removeTask(first.id);
    assert.deepEqual(store.getState().tasks.map((t) => t.id), [second.id]);
    assert.match(store.undoLabel, /Deleted/);
    assert.equal(store.undo(), true);
    assert.deepEqual(store.getState().tasks.map((t) => t.id), [first.id, second.id]);
    assert.equal(store.undo(), false, 'undo is single use');
  });
  it('clears a selection that points at a deleted task', () => {
    const store = seeded();
    const id = store.getState().tasks[0].id;
    store.select(id);
    store.removeTask(id);
    assert.equal(store.getState().selectedId, null);
  });
  it('clears completed tasks and can undo', () => {
    const store = seeded();
    store.toggleTask(store.getState().tasks[0].id);
    assert.equal(store.clearCompleted(), 1);
    assert.equal(store.getState().tasks.length, 1);
    store.undo();
    assert.equal(store.getState().tasks.length, 2);
    assert.equal(createStore().clearCompleted(), 0);
  });
  it('drops the undo entry after any newer change, so undo cannot clobber edits', () => {
    const store = seeded();
    store.removeTask(store.getState().tasks[0].id);
    store.addTask({ title: 'Newer' });
    assert.equal(store.undoLabel, null);
    assert.equal(store.undo(), false);
    assert.equal(store.getState().tasks.length, 2);
  });
  it('supports undoing an import', () => {
    const store = seeded();
    store.replaceAll([createTask({ title: 'Imported' })]);
    assert.equal(store.getState().tasks[0].title, 'Imported');
    store.undo();
    assert.equal(store.getState().tasks.length, 2);
  });
});

describe('store: focus time, filters, selection, subscriptions', () => {
  it('adds focus time to the right task only', () => {
    const store = seeded();
    const [a, b] = store.getState().tasks;
    store.addFocusTime(a.id, 25 * 60000);
    assert.equal(store.getState().tasks[0].focusMs, 25 * 60000);
    assert.equal(store.getState().tasks[1].focusMs, b.focusMs);
    store.addFocusTime('missing', 5); // no throw
  });
  it('merges filter patches', () => {
    const store = seeded();
    store.setFilters({ status: 'active' });
    store.setFilters({ query: 'x' });
    assert.deepEqual(store.getState().filters, { query: 'x', status: 'active', priority: 'all', sort: 'manual' });
  });
  it('does not notify when the selection is unchanged', () => {
    const store = seeded();
    const id = store.getState().tasks[0].id;
    let calls = 0;
    store.select(id);
    store.subscribe(() => { calls += 1; });
    store.select(id);
    assert.equal(calls, 0);
  });
  it('unsubscribes', () => {
    const store = seeded();
    let calls = 0;
    const off = store.subscribe(() => { calls += 1; });
    off();
    store.addTask({ title: 'x' });
    assert.equal(calls, 0);
  });
  it('syncs external changes and drops a stale selection', () => {
    const store = seeded();
    store.select(store.getState().tasks[0].id);
    store.syncExternal([createTask({ title: 'From another tab' })]);
    assert.equal(store.getState().tasks[0].title, 'From another tab');
    assert.equal(store.getState().selectedId, null);
  });
});
