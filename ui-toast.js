/**
 * A single transient message with an optional action button (used for Undo).
 * The message is also sent to the live region so screen readers hear it.
 * The countdown pauses while the pointer or keyboard focus is on the toast.
 *
 * @param {{root: HTMLElement, message: HTMLElement, action: HTMLButtonElement, announce: (m: string) => void}} els
 */
export function createToast({ root, message, action, announce }) {
  let timer = 0;
  let remaining = 0;
  let startedAt = 0;
  let onAction = null;

  function clearTimer() {
    clearTimeout(timer);
    timer = 0;
  }

  function arm(ms) {
    clearTimer();
    remaining = ms;
    startedAt = Date.now();
    timer = setTimeout(hide, ms);
  }

  function hide() {
    clearTimer();
    root.hidden = true;
    onAction = null;
  }

  function pause() {
    if (!timer) return;
    clearTimer();
    remaining -= Date.now() - startedAt;
  }

  function resume() {
    if (root.hidden || timer) return;
    arm(Math.max(1500, remaining));
  }

  /**
   * @param {string} text
   * @param {{actionLabel?: string, onAction?: () => void, duration?: number}} [options]
   */
  function show(text, { actionLabel, onAction: handler, duration = 5000 } = {}) {
    message.textContent = text;
    onAction = handler ?? null;
    action.hidden = !handler;
    if (actionLabel) action.textContent = actionLabel;
    root.hidden = false;
    // Restart the entrance animation for consecutive toasts.
    root.style.animation = 'none';
    void root.offsetWidth;
    root.style.animation = '';
    announce(actionLabel ? `${text}. ${actionLabel} available.` : text);
    arm(duration);
  }

  action.addEventListener('click', () => {
    const run = onAction;
    hide();
    run?.();
  });
  root.addEventListener('pointerenter', pause);
  root.addEventListener('pointerleave', resume);
  root.addEventListener('focusin', pause);
  root.addEventListener('focusout', resume);

  return { show, hide };
}
