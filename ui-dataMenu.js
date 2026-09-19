import { parseTasks, serializeTasks } from './storage.js';
import { byId, todayISO } from './utils.js';

const MAX_IMPORT_BYTES = 1_000_000;

/**
 * Export and import of the task list as a JSON file.
 * @param {{
 *   getTasks: () => import('./taskModel.js').Task[],
 *   onImport: (tasks: import('./taskModel.js').Task[], skipped: number) => void,
 *   onError: (message: string) => void,
 *   onExport: (count: number) => void
 * }} options
 */
export function mountDataMenu({ getTasks, onImport, onError, onExport }) {
  const fileInput = /** @type {HTMLInputElement} */ (byId('import-file'));

  byId('export-btn').addEventListener('click', () => {
    const tasks = getTasks();
    const blob = new Blob([serializeTasks(tasks)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `focuslist-${todayISO()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onExport(tasks.length);
  });

  byId('import-btn').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      onError('That file is larger than 1 MB, which is too big for a task list.');
      return;
    }
    try {
      const { tasks, skipped } = parseTasks(await file.text());
      onImport(tasks, skipped);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not read that file.');
    }
  });
}
