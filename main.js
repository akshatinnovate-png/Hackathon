/**
 * Application entry point. Creates the store, mounts every UI module and
 * connects them. No business logic lives here; it only wires things together.
 */
import { DONE_COLOR, PRIORITIES, STORAGE_KEY, UNDO_TOAST_MS } from './config.js';
import { createConstellation } from './cosmos-constellation.js';
import { createStarfield } from './cosmos-starfield.js';
import { applyFilters, isFiltering } from './filters.js';
import { buildSeedTasks, createStorage } from './storage.js';
import { createStore } from './store.js';
import { computeStats } from './taskModel.js';
import { createAnnouncer } from './ui-announcer.js';
import { mountDataMenu } from './ui-dataMenu.js';
import { enhanceDialog } from './ui-dialogs.js';
import { mountFilters } from './ui-filters.js';
import { mountEditDialog, mountNewTaskForm } from './ui-forms.js';
import { mountShortcuts } from './ui-shortcuts.js';
import { mountSummary } from './ui-summary.js';
import { mountTaskList } from './ui-taskList.js';
import { mountTimerPanel } from './ui-timerPanel.js';
import { createToast } from './ui-toast.js';
import { byId, plural, prefersReducedMotion, todayISO } from './utils.js';

const reducedMotion = prefersReducedMotion();

/* ---------- state and persistence ---------- */

const storage = createStorage();
const loaded = storage.load();
const store = createStore(loaded.tasks ?? buildSeedTasks());
let applyingExternalChange = false;
let saveFailureShown = false;

/* ---------- ui modules ---------- */

const announce = createAnnouncer(byId('announcer'));
const toast = createToast({ root: byId('toast'), message: byId('toast-msg'), action: /** @type {HTMLButtonElement} */ (byId('toast-action')), announce });
const starfield = createStarfield(/** @type {HTMLCanvasElement} */ (byId('starfield')), { reducedMotion });
const constellation = createConstellation(/** @type {HTMLCanvasElement} */ (byId('constellation')), {
  tooltip: byId('constellation-tip'),
  reducedMotion,
  onPick: (id) => store.select(id),
});
const summary = mountSummary();
const filterControls = mountFilters({ store, onClearCompleted: clearCompleted });
const newTaskForm = mountNewTaskForm({ onSubmit: addTask });
const editDialog = mountEditDialog({ onSave: (id, patch) => store.updateTask(id, patch) });
const helpDialog = /** @type {HTMLDialogElement} */ (enhanceDialog(/** @type {HTMLDialogElement} */ (byId('help-dialog'))));
const timerPanel = mountTimerPanel({
  announce,
  onFinish: (taskId, ms) => { if (taskId) store.addFocusTime(taskId, ms); },
});
const taskList = mountTaskList({
  list: /** @type {HTMLUListElement} */ (byId('task-list')),
  template: /** @type {HTMLTemplateElement} */ (byId('task-template')),
  empty: { root: byId('empty-state'), title: byId('empty-title'), body: byId('empty-body') },
  handlers: { onToggle: toggleTask, onSelect: (id) => store.select(id), onEdit: openEditor, onDelete: deleteTask },
});

/* ---------- actions ---------- */

function colorOf(task) {
  return task.done ? DONE_COLOR : PRIORITIES[task.priority].color;
}

function addTask(input) {
  const result = store.addTask(input);
  if (!result.ok) return result;
  constellation.burst(result.task.id, colorOf(result.task), 26);
  const hidden = applyFilters([result.task], store.getState().filters).length === 0;
  toast.show(hidden ? `Added “${result.task.title}”. It is hidden by your current filters.` : `Added “${result.task.title}”.`, { duration: 3500 });
  return result;
}

function toggleTask(id) {
  const task = store.toggleTask(id);
  if (!task) return;
  if (task.done) constellation.burst(id, '#c3d3a5', 30);
  const { done, total } = computeStats(store.getState().tasks);
  announce(`${task.title} marked ${task.done ? 'complete' : 'incomplete'}. ${done} of ${total} complete.`);
}

function openEditor(id) {
  const task = store.getState().tasks.find((t) => t.id === id);
  if (task) editDialog.open(task);
}

function offerUndo(label) {
  toast.show(label, { actionLabel: 'Undo', onAction: undo, duration: UNDO_TOAST_MS });
}

function deleteTask(id) {
  const { tasks, filters } = store.getState();
  const visible = applyFilters(tasks, filters);
  const index = visible.findIndex((t) => t.id === id);
  const neighbour = visible[index + 1] ?? visible[index - 1] ?? null;
  const task = tasks.find((t) => t.id === id);
  if (task) constellation.burst(id, colorOf(task), 22);
  if (!store.removeTask(id)) return;
  offerUndo(store.undoLabel);
  if (!neighbour || !taskList.focusRow(neighbour.id)) newTaskForm.focus();
}

function clearCompleted() {
  const count = store.clearCompleted();
  if (count) offerUndo(store.undoLabel);
  else toast.show('There are no completed tasks to clear.', { duration: 3000 });
}

function undo() {
  if (store.undo()) toast.show('Restored.', { duration: 2500 });
}

function resetView() {
  constellation.resetView();
  store.select(null);
}

/* ---------- rendering ---------- */

function render(state, prev) {
  const today = todayISO();
  const visible = applyFilters(state.tasks, state.filters);
  const tasksChanged = !prev || state.tasks !== prev.tasks;

  if (tasksChanged) {
    summary.renderStats(computeStats(state.tasks, today));
    timerPanel.setTasks(state.tasks);
  }
  taskList.render(visible, { selectedId: state.selectedId, totalCount: state.tasks.length, filtering: isFiltering(state.filters), today });
  summary.renderSelection(state.tasks.find((t) => t.id === state.selectedId) ?? null, today);
  filterControls.renderCount(visible.length, state.tasks.length);
  constellation.update({ tasks: state.tasks, visibleIds: new Set(visible.map((t) => t.id)), selectedId: state.selectedId });
  if (state.selectedId && state.selectedId !== prev?.selectedId) taskList.reveal(state.selectedId);
}

store.subscribe((state, prev) => {
  render(state, prev);
  if (state.tasks !== prev.tasks && !applyingExternalChange && !storage.save(state.tasks) && !saveFailureShown) {
    saveFailureShown = true;
    toast.show('Your changes could not be saved (storage is full or blocked). Use Export to keep a copy.', { duration: 10000 });
  }
});

/* ---------- wiring ---------- */

byId('selection').addEventListener('click', (event) => {
  const button = event.target instanceof Element ? event.target.closest('[data-sel-action]') : null;
  const id = store.getState().selectedId;
  if (!button || !id) return;
  const action = button.getAttribute('data-sel-action');
  if (action === 'close') resetView();
  else if (action === 'toggle') toggleTask(id);
  else if (action === 'edit') openEditor(id);
  else if (action === 'delete') deleteTask(id);
});

byId('zoom-in').addEventListener('click', () => constellation.zoomBy(1.25));
byId('zoom-out').addEventListener('click', () => constellation.zoomBy(0.8));
byId('zoom-reset').addEventListener('click', resetView);
byId('help-btn').addEventListener('click', () => helpDialog.showModal());

mountDataMenu({
  getTasks: () => store.getState().tasks,
  onExport: (count) => toast.show(`Exported ${plural(count, 'task')}.`, { duration: 3000 }),
  onError: (message) => toast.show(message, { duration: 6000 }),
  onImport: (tasks, skipped) => {
    store.replaceAll(tasks);
    offerUndo(`Imported ${plural(tasks.length, 'task')}${skipped ? `, skipped ${skipped} invalid` : ''}.`);
  },
});

mountShortcuts({
  newTask: () => newTaskForm.focus(),
  search: () => filterControls.focusSearch(),
  zoomIn: () => constellation.zoomBy(1.25),
  zoomOut: () => constellation.zoomBy(0.8),
  resetView,
  undo,
  help: () => helpDialog.showModal(),
  escape: () => { if (store.getState().selectedId) resetView(); },
});

// Keep several open tabs in step.
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return;
  const { tasks } = storage.load();
  if (!tasks) return;
  applyingExternalChange = true;
  store.syncExternal(tasks);
  applyingExternalChange = false;
});

// "Overdue" depends on the date, so refresh when the tab becomes visible again.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) render(store.getState(), null);
});

/* ---------- start ---------- */

render(store.getState(), null);
// Draw one still frame now; begin animating once the browser is idle so first paint is never delayed.
(window.requestIdleCallback ?? ((cb) => setTimeout(cb, 300)))(() => starfield.start(), { timeout: 1500 });

if (loaded.recovered) toast.show('Saved data could not be read, so the list was reset. A copy of the old data was kept in this browser.', { duration: 10000 });
else if (!storage.persistent) toast.show('This browser is blocking storage, so tasks will be lost when you close the tab. Use Export to keep a copy.', { duration: 10000 });

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ }));
}
