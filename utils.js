/**
 * Small, dependency-free helpers shared across modules.
 */

/** @param {string} selector @param {ParentNode} [root] */
export const $ = (selector, root = document) => root.querySelector(selector);

/** @param {string} selector @param {ParentNode} [root] */
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/**
 * Returns a required element or throws a descriptive error at start-up,
 * which is easier to debug than a null dereference later.
 * @param {string} id
 * @returns {HTMLElement}
 */
export function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required element #${id}`);
  return el;
}

/** @param {number} value @param {number} min @param {number} max */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Trailing-edge debounce.
 * @template {(...args: any[]) => void} F
 * @param {F} fn @param {number} wait
 * @returns {F}
 */
export function debounce(fn, wait) {
  let timer = 0;
  return /** @type {F} */ ((...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  });
}

/** Collision-resistant enough for a local list: time + random suffix. */
export function newId() {
  return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user's day). */
export function todayISO(now = Date.now()) {
  const d = new Date(now);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** @param {string} iso YYYY-MM-DD */
export function isValidISODate(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Formats a YYYY-MM-DD string or epoch ms as "Sep 22". */
export function formatShortDate(value) {
  let date;
  if (typeof value === 'string') {
    const [y, m, d] = value.split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(value);
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** 90 -> "1 h 30 min", 25 -> "25 min", 0 -> "0 min". @param {number} ms */
export function formatDuration(ms) {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** @returns {boolean} */
export function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Deterministic PRNG (LCG) so the sky looks the same on every visit. @param {number} seed */
export function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Pluralises simple English nouns. */
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
