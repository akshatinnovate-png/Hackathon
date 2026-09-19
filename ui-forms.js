/**
 * The "New task" form and the edit dialog.
 * Both validate through the store, so rules live in one place.
 *
 * @typedef {import('./taskModel.js').Task} Task
 */
import { byId } from './utils.js';
import { enhanceDialog } from './ui-dialogs.js';

function showError(input, output, message) {
  output.textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

/**
 * @param {{onSubmit: (input: {title:string, priority:string, due:string|null}) => {ok:boolean, error?:string}}} options
 */
export function mountNewTaskForm({ onSubmit }) {
  const form = /** @type {HTMLFormElement} */ (byId('new-form'));
  const title = /** @type {HTMLInputElement} */ (byId('new-title'));
  const due = /** @type {HTMLInputElement} */ (byId('new-due'));
  const error = byId('new-error');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const priority = /** @type {HTMLInputElement} */ (form.querySelector('input[name="priority"]:checked')).value;
    const result = onSubmit({ title: title.value, priority, due: due.value || null });
    if (!result.ok) {
      showError(title, error, result.error ?? 'Could not add that task.');
      title.focus();
      return;
    }
    showError(title, error, '');
    title.value = '';
    due.value = '';
    title.focus();
  });

  title.addEventListener('input', () => {
    if (error.textContent) showError(title, error, '');
  });

  return { focus: () => title.focus() };
}

/**
 * @param {{onSave: (id: string, patch: {title:string, priority:string, due:string|null, notes:string}) => {ok:boolean, error?:string}}} options
 */
export function mountEditDialog({ onSave }) {
  const dialog = /** @type {HTMLDialogElement} */ (enhanceDialog(/** @type {HTMLDialogElement} */ (byId('edit-dialog'))));
  const form = /** @type {HTMLFormElement} */ (byId('edit-form'));
  const title = /** @type {HTMLInputElement} */ (byId('edit-title'));
  const due = /** @type {HTMLInputElement} */ (byId('edit-due'));
  const notes = /** @type {HTMLTextAreaElement} */ (byId('edit-notes'));
  const error = byId('edit-error');
  let editingId = null;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!editingId) return;
    const priority = /** @type {HTMLInputElement} */ (form.querySelector('input[name="edit-priority"]:checked')).value;
    const result = onSave(editingId, { title: title.value, priority, due: due.value || null, notes: notes.value });
    if (!result.ok) {
      showError(title, error, result.error ?? 'Could not save changes.');
      title.focus();
      return;
    }
    dialog.close();
  });

  dialog.addEventListener('close', () => { editingId = null; });

  /** @param {Task} task */
  function open(task) {
    editingId = task.id;
    title.value = task.title;
    due.value = task.due ?? '';
    notes.value = task.notes;
    /** @type {HTMLInputElement} */ (form.querySelector(`input[name="edit-priority"][value="${task.priority}"]`)).checked = true;
    showError(title, error, '');
    dialog.showModal();
    title.focus();
    title.select();
  }

  return { open };
}
