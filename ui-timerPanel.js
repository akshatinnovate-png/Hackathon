/**
 * Focus timer panel. Timing maths lives in timer.js; this file only
 * connects it to the DOM and reports finished sessions.
 *
 * @typedef {import('./taskModel.js').Task} Task
 */
import { DEFAULT_FOCUS_MINUTES } from './config.js';
import { createTimer, formatClock, isFinished, pauseTimer, resetTimer, startTimer, timeLeft } from './timer.js';
import { byId, formatDuration } from './utils.js';

const TICK_MS = 250;
const IDLE_STATUS = "Pick a task and start a session. Finished sessions add to that task's focus time.";

/**
 * @param {{onFinish: (taskId: string|null, durationMs: number) => void, announce: (m: string) => void}} options
 */
export function mountTimerPanel({ onFinish, announce }) {
  const root = byId('timer-panel').querySelector('.timer');
  const clock = byId('timer-clock');
  const select = /** @type {HTMLSelectElement} */ (byId('timer-task'));
  const toggle = /** @type {HTMLButtonElement} */ (byId('timer-toggle'));
  const status = byId('timer-status');
  const baseTitle = document.title;

  let timer = createTimer(DEFAULT_FOCUS_MINUTES * 60_000);
  let interval = 0;
  let lockedTaskId = null; // the task chosen when the session started

  const minutes = () => Number(/** @type {HTMLInputElement} */ (document.querySelector('input[name="minutes"]:checked')).value);

  function render() {
    const left = timeLeft(timer, Date.now());
    const text = formatClock(left);
    if (clock.textContent !== text) clock.textContent = text;
    root.dataset.running = String(timer.running);
    toggle.textContent = timer.running ? 'Pause' : timer.remainingMs < timer.durationMs ? 'Resume' : 'Start focus';
    document.title = timer.running ? `${text} · ${baseTitle}` : baseTitle;
  }

  function stopTicking() {
    clearInterval(interval);
    interval = 0;
  }

  function tick() {
    const now = Date.now();
    if (isFinished(timer, now)) {
      const duration = timer.durationMs;
      const taskId = lockedTaskId;
      stopTicking();
      timer = resetTimer(timer);
      lockedTaskId = null;
      render();
      status.textContent = `Session complete: ${formatDuration(duration)} of focus logged. Take a short break.`;
      announce(`Focus session complete. ${formatDuration(duration)} logged.`);
      onFinish(taskId, duration);
      return;
    }
    render();
  }

  function start() {
    lockedTaskId = select.value || null;
    timer = startTimer(timer, Date.now());
    interval = setInterval(tick, TICK_MS);
    status.textContent = lockedTaskId ? 'Focusing. Only a finished session is logged to the task.' : 'Focusing. Only a finished session is logged.';
    announce('Focus session started.');
    render();
  }

  function pause() {
    stopTicking();
    timer = pauseTimer(timer, Date.now());
    status.textContent = 'Paused.';
    render();
  }

  function reset() {
    stopTicking();
    timer = resetTimer(timer, minutes() * 60_000);
    lockedTaskId = null;
    status.textContent = IDLE_STATUS;
    render();
  }

  toggle.addEventListener('click', () => (timer.running ? pause() : start()));
  byId('timer-reset').addEventListener('click', reset);
  document.addEventListener('change', (event) => {
    const t = event.target;
    if (t instanceof HTMLInputElement && t.name === 'minutes' && !timer.running) reset();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && timer.running) tick(); });

  /** Keeps the task menu in sync with the list. @param {Task[]} tasks */
  function setTasks(tasks) {
    const current = timer.running ? lockedTaskId : select.value;
    const pending = tasks.filter((t) => !t.done);
    const signature = pending.map((t) => `${t.id}:${t.title}`).join('|');
    if (select.dataset.signature !== signature) {
      select.dataset.signature = signature;
      select.replaceChildren(new Option('No specific task', ''), ...pending.map((t) => new Option(t.title, t.id)));
    }
    select.value = pending.some((t) => t.id === current) ? current : '';
    select.disabled = timer.running;
  }

  render();
  return { setTasks };
}
