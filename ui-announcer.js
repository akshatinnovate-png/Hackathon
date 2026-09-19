/**
 * Screen-reader announcements through a polite live region.
 * Clearing first makes repeated identical messages announce again.
 * @param {HTMLElement} region
 */
export function createAnnouncer(region) {
  let timer = 0;
  return (message) => {
    clearTimeout(timer);
    region.textContent = '';
    timer = setTimeout(() => { region.textContent = message; }, 60);
  };
}
