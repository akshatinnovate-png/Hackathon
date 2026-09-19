/**
 * Read-only views of the current numbers: stat tiles, the core label in the
 * constellation, the priority distribution bars and the selection card.
 *
 * @typedef {import('./taskModel.js').Task} Task
 */
import { DONE_COLOR, PRIORITIES, PRIORITY_KEYS } from './config.js';
import { isOverdue } from './taskModel.js';
import { formatDuration, formatShortDate, byId } from './utils.js';

function setText(el, value) {
  const text = String(value);
  if (el.textContent !== text) el.textContent = text;
}

export function mountSummary() {
  const els = {
    total: byId('stat-total'),
    done: byId('stat-done'),
    pending: byId('stat-pending'),
    overdue: byId('stat-overdue'),
    canvas: byId('constellation'),
    selection: byId('selection'),
    dot: byId('sel-dot'),
    title: byId('sel-title'),
    meta: byId('sel-meta'),
    notes: byId('sel-notes'),
    toggle: byId('sel-toggle'),
  };
  const distRows = new Map(PRIORITY_KEYS.map((key) => [key, document.querySelector(`.dist__row[data-priority="${key}"]`)]));

  /** @param {ReturnType<import('./taskModel.js').computeStats>} stats */
  function renderStats(stats) {
    setText(els.total, stats.total);
    setText(els.done, stats.done);
    setText(els.pending, stats.pending);
    setText(els.overdue, stats.overdue);
    els.canvas.setAttribute(
      'aria-label',
      `Constellation of ${stats.total} tasks, ${stats.done} complete, ${stats.pending} pending. The task list is the accessible equivalent of this picture.`,
    );

    const max = Math.max(1, stats.total);
    for (const key of PRIORITY_KEYS) {
      const row = distRows.get(key);
      row.querySelector('.dist__fill').style.setProperty('--value', String(stats.byPriority[key] / max));
      setText(row.querySelector('.dist__count'), stats.byPriority[key]);
    }
  }

  /** @param {Task|null} task @param {string} today */
  function renderSelection(task, today) {
    els.selection.hidden = !task;
    if (!task) return;
    els.dot.style.setProperty('--dot-color', task.done ? DONE_COLOR : PRIORITIES[task.priority].color);
    setText(els.title, task.title);
    const bits = [`${PRIORITIES[task.priority].label} priority`, task.done ? 'Complete' : 'Pending'];
    if (task.due) bits.push(isOverdue(task, today) ? `overdue since ${formatShortDate(task.due)}` : `due ${formatShortDate(task.due)}`);
    bits.push(`created ${formatShortDate(task.created)}`);
    if (task.focusMs >= 60000) bits.push(`${formatDuration(task.focusMs)} focused`);
    setText(els.meta, bits.join(' · '));
    els.notes.hidden = !task.notes;
    setText(els.notes, task.notes);
    setText(els.toggle, task.done ? 'Mark incomplete' : 'Mark complete');
  }

  return { renderStats, renderSelection };
}
