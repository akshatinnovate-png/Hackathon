/**
 * Central configuration. Nothing else in the app hard-codes these values.
 */
export const STORAGE_KEY = 'focuslist.tasks.v2';
export const LEGACY_STORAGE_KEY = 'focuslist_tasks';
export const SCHEMA_VERSION = 2;

export const MAX_TASKS = 300;
export const MAX_TITLE_LENGTH = 120;
export const MAX_NOTES_LENGTH = 500;

/** Priority keys ordered from most to least urgent. */
export const PRIORITY_KEYS = Object.freeze(['high', 'medium', 'low']);

export const PRIORITIES = Object.freeze({
  high: Object.freeze({ label: 'High', weight: 3, color: '#e08a3c', radius: 7.5 }),
  medium: Object.freeze({ label: 'Medium', weight: 2, color: '#ddb264', radius: 6 }),
  low: Object.freeze({ label: 'Low', weight: 1, color: '#aebf92', radius: 5 }),
});

export const DONE_COLOR = '#8ea073';

export const STATUS_FILTERS = Object.freeze(['all', 'active', 'completed']);
export const SORT_MODES = Object.freeze(['manual', 'newest', 'priority', 'due']);

export const DEFAULT_FOCUS_MINUTES = 25;
export const UNDO_TOAST_MS = 7000;
export const SEARCH_DEBOUNCE_MS = 120;

export const SEED_TASKS = Object.freeze([
  { title: 'Draft the Q3 orbit review', priority: 'high', done: false },
  { title: 'Reply to the lab about sample prep', priority: 'medium', done: false },
  { title: 'Reread chapter 4 on wave mechanics', priority: 'medium', done: true },
  { title: 'Water the plants', priority: 'low', done: false },
  { title: 'File the telescope booking', priority: 'low', done: true },
  { title: 'Outline the launch narrative', priority: 'high', done: false },
]);
