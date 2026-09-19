# Performance

## Budget

| Item | Target | Actual |
| --- | --- | --- |
| Total transfer (HTML, CSS, JS, icons) | under 150 KB | about 90 KB source, no compression |
| Third-party requests | 0 | 0 |
| Web fonts | 0 | 0 (system font stacks) |
| Layout shift | 0 | 0 |

## Measured

Lighthouse 12, headless Chromium with software rendering (no GPU), mobile emulation, run locally:

| Category | Score |
| --- | --- |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| Performance | 91 to 98 across runs |

First Contentful Paint 1.5 s and Largest Contentful Paint 1.5 to 1.6 s under Lighthouse's simulated slow 4G and 4x CPU slowdown. Total Blocking Time varies between about 160 and 360 ms. Real devices with a GPU render canvas faster than this test environment, so treat these as conservative numbers and re-run them on your own hosting.

## What keeps it fast

- **No framework or bundle.** The browser loads small ES modules directly, and `modulepreload` fetches the entry point early.
- **Rendering cost is bounded.** Glow sprites and the percentage label are drawn once and reused. Star counts and pixel ratio scale with screen size and CPU cores.
- **The sky waits its turn.** One still frame paints immediately; animation starts when the browser is idle.
- **Animation stops when it cannot be seen.** Both canvases pause when the tab is hidden, and the constellation also pauses when scrolled off screen. Orbits run at 30 fps.
- **Reduced motion means on-demand drawing**, so those users use almost no CPU while idle.
- **Small DOM updates.** Task rows are reused and text is only written when it changed.
- **No backdrop blur on panels.** Blurring a moving canvas behind every panel cost more than it added; the panels use a slightly more opaque fill instead.
- **Debounced search** (120 ms) avoids re-filtering on every key press.
- **Offline cache.** The service worker serves repeat visits from cache and refreshes in the background.

## How to re-measure

```bash
npm start
npx lighthouse http://localhost:8080 --only-categories=performance,accessibility,best-practices,seo
```
