/**
 * Focus timer as pure state transitions. It stores an absolute end time
 * rather than counting ticks, so it stays accurate when the tab is throttled.
 *
 * @typedef {{durationMs:number, remainingMs:number, endsAt:number|null, running:boolean}} TimerState
 */

/** @param {number} durationMs @returns {TimerState} */
export function createTimer(durationMs) {
  return { durationMs, remainingMs: durationMs, endsAt: null, running: false };
}

/** @param {TimerState} t @param {number} now */
export function startTimer(t, now) {
  if (t.running) return t;
  const remainingMs = t.remainingMs > 0 ? t.remainingMs : t.durationMs;
  return { ...t, remainingMs, running: true, endsAt: now + remainingMs };
}

/** @param {TimerState} t @param {number} now */
export function pauseTimer(t, now) {
  if (!t.running) return t;
  return { ...t, running: false, endsAt: null, remainingMs: timeLeft(t, now) };
}

/** @param {TimerState} t @param {number} [durationMs] */
export function resetTimer(t, durationMs = t.durationMs) {
  return createTimer(durationMs);
}

/** @param {TimerState} t @param {number} now */
export function timeLeft(t, now) {
  if (!t.running || t.endsAt === null) return t.remainingMs;
  return Math.max(0, t.endsAt - now);
}

/** @param {TimerState} t @param {number} now */
export const isFinished = (t, now) => t.running && timeLeft(t, now) <= 0;

/** 1500000 -> "25:00". Rounds up so the display never shows 00:00 early. @param {number} ms */
export function formatClock(ms) {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
