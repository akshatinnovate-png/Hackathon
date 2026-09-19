/**
 * Renders the task list. Rows are created once, then updated in place and
 * re-ordered, so focus, scroll position and animations survive state changes.
 *
 * @typedef {import('./taskModel.js').Task} Task
 */
import { PRIORITIES } from './config.js';
import { isOverdue } from './taskModel.js';
import { formatDuration, formatShortDate } from './utils.js';

/**
 * @param {{
 *   list: HTMLUListElement,
 *   template: HTMLTemplateElement,
 *   empty: {root: HTMLElement, title: HTMLElement, body: HTMLElement},
 *   handlers: {onToggle: (id: string) => void, onSelect: (id: string) => void, onEdit: (id: string) => void, onDelete: (id: string) => void}
 * }} options
 */
export function mountTaskList({ list, template, empty, handlers }) {
  /** @type {Map<string, HTMLLIElement>} */
  const rows = new Map();

  const idOf = (el) => el.closest('.task')?.dataset.id;

  list.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.classList.contains('task__check')) {
      handlers.onToggle(idOf(event.target));
    }
  });

  list.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    if (!button) return;
    const id = idOf(button);
    if (!id) return;
    const action = button.dataset.action;
    if (action === 'select') handlers.onSelect(id);
    else if (action === 'edit') handlers.onEdit(id);
    else if (action === 'delete') handlers.onDelete(id);
  });

  /** @param {Task} task @param {string} today */
  function metaText(task, today) {
    const parts = [PRIORITIES[task.priority].label];
    if (task.done) parts.push('Completed');
    else if (task.due) parts.push(isOverdue(task, today) ? `Overdue since ${formatShortDate(task.due)}` : `Due ${formatShortDate(task.due)}`);
    if (task.focusMs >= 60000) parts.push(`${formatDuration(task.focusMs)} focused`);
    return parts.join(' · ');
  }

  /** @param {Task} task */
  function createRow(task) {
    const li = /** @type {HTMLLIElement} */ (template.content.firstElementChild.cloneNode(true));
    li.dataset.id = task.id;
    return li;
  }

  function updateRow(li, task, today, selected) {
    li.dataset.priority = task.priority;
    li.dataset.done = String(task.done);
    li.dataset.selected = String(selected);

    const title = li.querySelector('.task__title');
    if (title.textContent !== task.title) title.textContent = task.title;
    title.id = `task-title-${task.id}`;

    const check = li.querySelector('.task__check');
    check.checked = task.done;
    check.setAttribute('aria-labelledby', title.id);

    const meta = li.querySelector('.task__meta');
    const text = metaText(task, today);
    if (meta.textContent !== text) meta.textContent = text;
    meta.dataset.overdue = String(isOverdue(task, today));

    const body = li.querySelector('[data-action="select"]');
    body.setAttribute('aria-pressed', String(selected));
    body.title = 'Show in constellation';
    li.querySelector('[data-action="edit"]').setAttribute('aria-label', `Edit ${task.title}`);
    li.querySelector('[data-action="delete"]').setAttribute('aria-label', `Delete ${task.title}`);
  }

  /**
   * @param {Task[]} visible tasks after filtering and sorting
   * @param {{selectedId: string|null, totalCount: number, filtering: boolean, today: string}} ctx
   */
  function render(visible, { selectedId, totalCount, filtering, today }) {
    const keep = new Set();
    let cursor = list.firstElementChild;
    for (const task of visible) {
      keep.add(task.id);
      let li = rows.get(task.id);
      if (!li) {
        li = createRow(task);
        rows.set(task.id, li);
      }
      updateRow(li, task, today, selectedId === task.id);
      if (li === cursor) cursor = cursor.nextElementSibling;
      else list.insertBefore(li, cursor);
    }
    for (const [id, li] of rows) {
      if (!keep.has(id)) {
        li.remove();
        rows.delete(id);
      }
    }

    const isEmpty = visible.length === 0;
    empty.root.hidden = !isEmpty;
    if (isEmpty) {
      if (totalCount === 0) {
        empty.title.textContent = 'Nothing on your plate.';
        empty.body.textContent = 'Add your first task and begin your focus journey.';
      } else if (filtering) {
        empty.title.textContent = 'No matching tasks.';
        empty.body.textContent = 'Try a different search or loosen the filters.';
      } else {
        empty.title.textContent = 'You are clear.';
        empty.body.textContent = 'Every task in the constellation is complete.';
      }
    }
  }

  /** Moves focus to a row's button. Returns false when the row is not on screen. */
  function focusRow(id, action = 'select') {
    const target = rows.get(id)?.querySelector(`[data-action="${action}"]`);
    if (!target) return false;
    target.focus();
    return true;
  }

  /** Scrolls a row into view without stealing focus. */
  function reveal(id) {
    rows.get(id)?.scrollIntoView({ block: 'nearest' });
  }

  return { render, focusRow, reveal };
}
