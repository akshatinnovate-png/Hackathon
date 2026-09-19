/**
 * Pure filtering and sorting for the task list.
 * @typedef {import('./taskModel.js').Task} Task
 * @typedef {{query:string, status:string, priority:string, sort:string}} Filters
 */
import { PRIORITIES } from './config.js';

export const DEFAULT_FILTERS = Object.freeze({ query: '', status: 'all', priority: 'all', sort: 'manual' });

/** @param {Task} task @param {Filters} f */
function matches(task, f) {
  if (f.status === 'active' && task.done) return false;
  if (f.status === 'completed' && !task.done) return false;
  if (f.priority !== 'all' && task.priority !== f.priority) return false;
  const q = f.query.trim().toLowerCase();
  if (q && !task.title.toLowerCase().includes(q) && !task.notes.toLowerCase().includes(q)) return false;
  return true;
}

/** @type {Record<string, (a: Task, b: Task) => number>} */
const COMPARATORS = {
  manual: () => 0,
  newest: (a, b) => b.created - a.created,
  priority: (a, b) => PRIORITIES[b.priority].weight - PRIORITIES[a.priority].weight || a.created - b.created,
  due: (a, b) => {
    if (a.due === b.due) return a.created - b.created;
    if (a.due === null) return 1; // tasks without a date go last
    if (b.due === null) return -1;
    return a.due < b.due ? -1 : 1;
  },
};

/**
 * Returns a new, filtered and sorted array. Never mutates the input.
 * Array.prototype.sort is stable, so "manual" keeps insertion order.
 * @param {Task[]} tasks @param {Filters} filters
 * @returns {Task[]}
 */
export function applyFilters(tasks, filters) {
  const compare = COMPARATORS[filters.sort] ?? COMPARATORS.manual;
  return tasks.filter((t) => matches(t, filters)).sort(compare);
}

/** True when any filter narrows the list. @param {Filters} f */
export function isFiltering(f) {
  return Boolean(f.query.trim()) || f.status !== 'all' || f.priority !== 'all';
}
