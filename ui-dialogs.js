/**
 * Adds the behaviour every dialog shares: [data-close] buttons and
 * click-outside-to-close. Native <dialog> already provides the focus trap,
 * Escape handling, inert background and focus restoration.
 * @param {HTMLDialogElement} dialog
 */
export function enhanceDialog(dialog) {
  dialog.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-close]')) {
      dialog.close();
      return;
    }
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      const outside = event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
      if (outside) dialog.close();
    }
  });
  return dialog;
}
