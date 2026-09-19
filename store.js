/**
 * Application state container. Holds the task list plus view state
 * (filters, selection) and notifies subscribers after every change.
 * All updates are immutable so subscribers can compare references cheaply.
 *
 * @typedef {import('./taskModel.js').Task} Task
 * @typedef {import('./filters.js').Filters} Filters
 * @typedef {{tasks: Task[], filters: Filters, selectedId: string|null}} State
 */
import { MAX_TASKS } from './config.js';
import { DEFAULT_FILTERS } from './filters.js';
import { applyPatch, createTask, toggleDone, validateTitle } from './taskModel.js';

/**
 * @param {Task[]} [initialTasks]
 */
export function createStore(initialTasks = []) {
  /** @type {State} */
  let state = { tasks: initialTasks, filters: { ...DEFAULT_FILTERS }, selectedId: null };
  /** @type {{label:string, tasks:Task[]}|null} Snapshot taken before the last destructive action. */
  let undoEntry = null;
  const listeners = new Set();

  /** @param {Partial<State>} patch */
  function set(patch) {
    const prev = state;
    state = { ...state, ...patch };
    listeners.forEach((fn) => fn(state, prev));
  }

  /** Any non-destructive change invalidates the pending undo, so undo can never overwrite newer edits. */
  function setTasks(tasks, extra = {}) {
    undoEntry = null;
    set({ tasks, ...extra });
  }

  function setTasksDestructive(tasks, label, extra = {}) {
    undoEntry = { label, tasks: state.tasks };
    set({ tasks, ...extra });
  }

  return {
    getState: () => state,

    /** @param {(state: State, prev: State) => void} fn @returns {() => void} unsubscribe */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** @param {{title:string, priority?:string, due?:string|null, notes?:string}} input */
    addTask(input) {
      const title = validateTitle(input.title);
      if (!title.ok) return { ok: false, error: title.error };
      if (state.tasks.length >= MAX_TASKS) return { ok: false, error: `You can keep up to ${MAX_TASKS} tasks. Complete or delete some first.` };
      const task = createTask({ ...input, title: title.value });
      setTasks([...state.tasks, task]);
      return { ok: true, task };
    },

    /** @param {string} id @param {Parameters<typeof applyPatch>[1]} patch */
    updateTask(id, patch) {
      if (patch.title !== undefined) {
        const title = validateTitle(patch.title);
        if (!title.ok) return { ok: false, error: title.error };
      }
      if (!state.tasks.some((t) => t.id === id)) return { ok: false, error: 'That task no longer exists.' };
      setTasks(state.tasks.map((t) => (t.id === id ? applyPatch(t, patch) : t)));
      return { ok: true };
    },

    /** @param {string} id */
    toggleTask(id) {
      let toggled = null;
      const tasks = state.tasks.map((t) => {
        if (t.id !== id) return t;
        toggled = toggleDone(t);
        return toggled;
      });
      if (toggled) setTasks(tasks);
      return toggled;
    },

    /** @param {string} id */
    removeTask(id) {
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return null;
      setTasksDestructive(state.tasks.filter((t) => t.id !== id), `Deleted “${task.title}”`, {
        selectedId: state.selectedId === id ? null : state.selectedId,
      });
      return task;
    },

    clearCompleted() {
      const doneCount = state.tasks.filter((t) => t.done).length;
      if (doneCount === 0) return 0;
      const keep = state.tasks.filter((t) => !t.done);
      const selectedGone = state.tasks.some((t) => t.id === state.selectedId && t.done);
      setTasksDestructive(keep, doneCount === 1 ? 'Cleared 1 completed task' : `Cleared ${doneCount} completed tasks`, {
        selectedId: selectedGone ? null : state.selectedId,
      });
      return doneCount;
    },

    /** Replaces the whole list (import). @param {Task[]} tasks */
    replaceAll(tasks) {
      setTasksDestructive(tasks, 'Imported tasks', { selectedId: null });
    },

    /** Adds finished focus-timer time to a task. @param {string} id @param {number} ms */
    addFocusTime(id, ms) {
      if (!state.tasks.some((t) => t.id === id)) return;
      setTasks(state.tasks.map((t) => (t.id === id ? { ...t, focusMs: t.focusMs + Math.round(ms) } : t)));
    },

    /** Called when another tab changed storage. Does not touch undo history. @param {Task[]} tasks */
    syncExternal(tasks) {
      undoEntry = null;
      const selectedId = tasks.some((t) => t.id === state.selectedId) ? state.selectedId : null;
      set({ tasks, selectedId });
    },

    get undoLabel() {
      return undoEntry ? undoEntry.label : null;
    },

    undo() {
      if (!undoEntry) return false;
      const { tasks } = undoEntry;
      undoEntry = null;
      set({ tasks });
      return true;
    },

    /** @param {Partial<Filters>} patch */
    setFilters(patch) {
      set({ filters: { ...state.filters, ...patch } });
    },

    /** @param {string|null} id */
    select(id) {
      if (state.selectedId !== id) set({ selectedId: id });
    },
  };
}
