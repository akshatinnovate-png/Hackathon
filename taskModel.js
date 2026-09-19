/**
 * Pure task functions: creation, validation, normalisation and statistics.
 * No DOM access, so everything here is unit-testable in Node.
 *
 * @typedef {'high'|'medium'|'low'} Priority
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {Priority} priority
 * @property {boolean} done
 * @property {number} created      epoch ms
 * @property {string|null} due     YYYY-MM-DD or null
 * @property {string} notes
 * @property {number|null} completedAt epoch ms or null
 * @property {number} focusMs      total focus-timer time logged on this task
 */
import { MAX_NOTES_LENGTH, MAX_TITLE_LENGTH, PRIORITY_KEYS } from './config.js';
import { isValidISODate, newId, todayISO } from './utils.js';

/** Collapses whitespace and enforces the length limit. */
export function sanitizeTitle(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH);
}

export function sanitizeNotes(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim().slice(0, MAX_NOTES_LENGTH);
}

export const isPriority = (value) => PRIORITY_KEYS.includes(value);

/** @returns {{ok:true, value:string}|{ok:false, error:string}} */
export function validateTitle(value) {
  const title = sanitizeTitle(value);
  if (!title) return { ok: false, error: 'Give the task a title first.' };
  return { ok: true, value: title };
}

/**
 * @param {{title:string, priority?:string, due?:string|null, notes?:string}} input
 * @param {number} [now]
 * @returns {Task}
 */
export function createTask(input, now = Date.now()) {
  return {
    id: newId(),
    title: sanitizeTitle(input.title),
    priority: isPriority(input.priority) ? /** @type {Priority} */ (input.priority) : 'medium',
    done: false,
    created: now,
    due: input.due && isValidISODate(input.due) ? input.due : null,
    notes: sanitizeNotes(input.notes),
    completedAt: null,
    focusMs: 0,
  };
}

/**
 * Coerces untrusted data (localStorage, imported files) into a valid Task, or null.
 * @param {unknown} raw
 * @param {number} [now]
 * @returns {Task|null}
 */
export function normalizeTask(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object') return null;
  const r = /** @type {Record<string, any>} */ (raw);
  const title = sanitizeTitle(r.title);
  if (!title) return null;
  const created = Number(r.created) > 0 ? Number(r.created) : now;
  const done = Boolean(r.done);
  return {
    id: typeof r.id === 'string' && r.id ? r.id.slice(0, 64) : newId(),
    title,
    priority: isPriority(r.priority) ? r.priority : 'medium',
    done,
    created,
    due: typeof r.due === 'string' && isValidISODate(r.due) ? r.due : null,
    notes: sanitizeNotes(r.notes),
    completedAt: done ? (Number(r.completedAt) > 0 ? Number(r.completedAt) : created) : null,
    focusMs: Number(r.focusMs) > 0 ? Math.round(Number(r.focusMs)) : 0,
  };
}

/**
 * Applies a validated patch to a task and returns a new object.
 * @param {Task} task
 * @param {Partial<Pick<Task,'title'|'priority'|'due'|'notes'>>} patch
 * @returns {Task}
 */
export function applyPatch(task, patch) {
  const next = { ...task };
  if (patch.title !== undefined) next.title = sanitizeTitle(patch.title) || task.title;
  if (patch.priority !== undefined && isPriority(patch.priority)) next.priority = patch.priority;
  if (patch.due !== undefined) next.due = patch.due && isValidISODate(patch.due) ? patch.due : null;
  if (patch.notes !== undefined) next.notes = sanitizeNotes(patch.notes);
  return next;
}

/** @param {Task} task @param {number} [now] */
export function toggleDone(task, now = Date.now()) {
  const done = !task.done;
  return { ...task, done, completedAt: done ? now : null };
}

/** A task is overdue when it is unfinished and its due date is before today. */
export function isOverdue(task, today = todayISO()) {
  return !task.done && task.due !== null && task.due < today;
}

/**
 * @param {Task[]} tasks
 * @param {string} [today]
 */
export function computeStats(tasks, today = todayISO()) {
  const byPriority = { high: 0, medium: 0, low: 0 };
  let done = 0;
  let overdue = 0;
  let focusMs = 0;
  for (const t of tasks) {
    byPriority[t.priority] += 1;
    if (t.done) done += 1;
    if (isOverdue(t, today)) overdue += 1;
    focusMs += t.focusMs;
  }
  const total = tasks.length;
  return {
    total,
    done,
    pending: total - done,
    overdue,
    focusMs,
    percent: total ? Math.round((done / total) * 100) : 0,
    ratio: total ? done / total : 0,
    byPriority,
  };
}
