# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.0] - 2026-09-19

### Added
- Due dates, notes, overdue highlighting and an overdue counter.
- Sorting by order added, newest, priority or due date.
- Undo for delete, clear completed and import.
- Focus timer that logs finished sessions to a task.
- Export and import as JSON with validation and clear errors.
- Keyboard shortcuts and a help dialog.
- Offline support and install prompt (service worker and web app manifest).
- Cross-tab sync through the `storage` event.
- Unit tests for logic, storage, timer, contrast and page structure.
- Documentation: README, architecture, accessibility, performance, contributing.

### Changed
- Rebuilt on plain HTML, CSS and ES modules. The previous framework runtime, inline styles and design-system stylesheet were removed.
- All styles come from design tokens in `tokens.css`.
- The intro animation no longer blocks the page. Content is visible immediately and the sky animates behind it.
- Filters, priority and timer length use native radio groups.
- The edit dialog uses the native `<dialog>` element.
- The percentage label is drawn inside the canvas so it zooms with the core.
- Mouse-wheel zoom now requires Ctrl/Cmd so page scrolling is never trapped.
- The task list moves directly under the form on small screens.

### Fixed
- Low-contrast muted text and placeholder colours now meet WCAG AA.
- Touch targets are at least 44 px.
- Focus is restored to a sensible element after deleting a task.
- Particle bursts appear at the correct position when the view is zoomed.

## [1.0.0]

- First version: add, edit, complete and delete tasks, search, priority and status filters, constellation view.
