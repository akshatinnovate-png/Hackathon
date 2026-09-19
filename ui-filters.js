import { SEARCH_DEBOUNCE_MS } from './config.js';
import { byId, debounce } from './utils.js';

/**
 * Wires the search box, status/priority filters and sort menu to the store.
 * @param {{store: ReturnType<typeof import('./store.js').createStore>, onClearCompleted: () => void}} options
 */
export function mountFilters({ store, onClearCompleted }) {
  const search = /** @type {HTMLInputElement} */ (byId('search'));
  const sort = /** @type {HTMLSelectElement} */ (byId('sort'));
  const result = byId('result-count');

  search.addEventListener('input', debounce(() => store.setFilters({ query: search.value }), SEARCH_DEBOUNCE_MS));
  sort.addEventListener('change', () => store.setFilters({ sort: sort.value }));

  document.addEventListener('change', (event) => {
    const t = event.target;
    if (!(t instanceof HTMLInputElement) || t.type !== 'radio') return;
    if (t.name === 'status') store.setFilters({ status: t.value });
    else if (t.name === 'fprio') store.setFilters({ priority: t.value });
  });

  byId('clear-completed').addEventListener('click', onClearCompleted);

  return {
    focusSearch: () => search.focus(),
    /** @param {number} shown @param {number} total */
    renderCount(shown, total) {
      const text = `${shown} ${shown === 1 ? 'task' : 'tasks'} shown of ${total}`;
      if (result.textContent !== text) result.textContent = text;
    },
  };
}
