/**
 * Global keyboard shortcuts. They are ignored while typing in a field and
 * when a modifier is held (except Ctrl/Cmd+Z), so they never fight the browser.
 * @param {{
 *   newTask: () => void, search: () => void, zoomIn: () => void, zoomOut: () => void,
 *   resetView: () => void, undo: () => void, help: () => void, escape: () => void
 * }} actions
 */
export function mountShortcuts(actions) {
  document.addEventListener('keydown', (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const typing = Boolean(target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)));
    const openDialog = document.querySelector('dialog[open]');

    if (event.key === 'Escape') {
      if (!openDialog) actions.escape();
      return;
    }
    if (typing || openDialog) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      actions.undo();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const handlers = {
      n: actions.newTask,
      '/': actions.search,
      '+': actions.zoomIn,
      '=': actions.zoomIn,
      '-': actions.zoomOut,
      _: actions.zoomOut,
      '0': actions.resetView,
      '?': actions.help,
    };
    const handler = handlers[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (handler) {
      event.preventDefault();
      handler();
    }
  });
}
