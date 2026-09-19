/**
 * Persistence layer. Knows how to read, write, migrate, export and import tasks.
 * The backend is injected so tests can run in Node and the app can fall back to
 * memory when localStorage is blocked (private mode, disabled cookies).
 *
 * @typedef {import('./taskModel.js').Task} Task
 * @typedef {{getItem(k:string):string|null, setItem(k:string,v:string):void, removeItem(k:string):void, persistent?:boolean}} Backend
 */
import { LEGACY_STORAGE_KEY, MAX_TASKS, SCHEMA_VERSION, SEED_TASKS, STORAGE_KEY } from './config.js';
import { createTask, normalizeTask } from './taskModel.js';
import { newId } from './utils.js';

/** @returns {Backend} */
export function createMemoryBackend() {
  const map = new Map();
  return {
    persistent: false,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

/** Returns localStorage if it works, otherwise an in-memory stand-in. @returns {Backend} */
export function detectBackend(scope = globalThis) {
  try {
    const store = scope.localStorage;
    const probe = '__focuslist_probe__';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return createMemoryBackend();
  }
}

/** Builds the example tasks shown on first launch. @param {number} [now] @returns {Task[]} */
export function buildSeedTasks(now = Date.now()) {
  return SEED_TASKS.map((seed, i) => {
    const task = createTask(seed, now - (SEED_TASKS.length - i) * 3_600_000);
    return seed.done ? { ...task, done: true, completedAt: task.created + 1_800_000 } : task;
  });
}

/**
 * Turns a list of untrusted values into valid tasks with unique ids.
 * @param {unknown[]} list
 * @returns {{tasks: Task[], skipped: number}}
 */
export function normalizeList(list) {
  const seen = new Set();
  const tasks = [];
  let skipped = 0;
  for (const raw of list) {
    const task = normalizeTask(raw);
    if (!task || tasks.length >= MAX_TASKS) {
      skipped += 1;
      continue;
    }
    if (seen.has(task.id)) task.id = newId();
    seen.add(task.id);
    tasks.push(task);
  }
  return { tasks, skipped };
}

/** @param {Task[]} tasks */
export function serializeTasks(tasks) {
  return JSON.stringify({ app: 'focuslist', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), tasks }, null, 2);
}

/**
 * Parses an exported file (or a bare array). Throws an Error with a
 * user-readable message when the file is not usable.
 * @param {string} text
 */
export function parseTasks(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const list = Array.isArray(data) ? data : data && Array.isArray(data.tasks) ? data.tasks : null;
  if (!list) throw new Error('No task list found in that file.');
  const result = normalizeList(list);
  if (result.tasks.length === 0 && list.length > 0) throw new Error('None of the tasks in that file were valid.');
  return result;
}

/** @param {Backend} [backend] */
export function createStorage(backend = detectBackend()) {
  return {
    get persistent() {
      return backend.persistent !== false;
    },

    /**
     * @returns {{tasks: Task[]|null, recovered: boolean}}
     * `tasks` is null when nothing has been saved yet (first run).
     */
    load() {
      let raw = null;
      try {
        raw = backend.getItem(STORAGE_KEY);
      } catch {
        return { tasks: null, recovered: false };
      }
      if (raw !== null) {
        try {
          const data = JSON.parse(raw);
          const list = Array.isArray(data) ? data : data?.tasks;
          if (!Array.isArray(list)) throw new Error('shape');
          return { tasks: normalizeList(list).tasks, recovered: false };
        } catch {
          // Keep the unreadable payload so nothing is silently lost.
          try { backend.setItem(`${STORAGE_KEY}.corrupt`, raw); } catch { /* ignore */ }
          return { tasks: [], recovered: true };
        }
      }
      try {
        const legacy = backend.getItem(LEGACY_STORAGE_KEY);
        if (legacy !== null) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed)) return { tasks: normalizeList(parsed).tasks, recovered: false };
        }
      } catch { /* fall through to first run */ }
      return { tasks: null, recovered: false };
    },

    /** @param {Task[]} tasks @returns {boolean} true when the write succeeded */
    save(tasks) {
      try {
        backend.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, tasks }));
        return true;
      } catch {
        return false;
      }
    },
  };
}
