# Accessibility

FocusList aims for WCAG 2.2 level AA. This page lists what is in place and how it is checked.

## Structure and navigation

- One `h1`, ordered headings, and landmarks (`header`, `main`, `footer`).
- A "Skip to tasks" link is the first focusable element.
- Every form control has a visible `<label>`. Groups of choices are `<fieldset>` with a `<legend>`.
- Priority, status and timer length use real radio inputs, so arrow keys and screen readers work natively.
- Dialogs use the native `<dialog>` element: focus is trapped, Escape closes it, the page behind is inert and focus returns to the control that opened it.

## Keyboard

- Every action is reachable with the keyboard. Nothing depends on hover or a pointer.
- Focus rings are 3 px and use the accent colour, which has more than 3:1 contrast on every surface.
- After a task is deleted, focus moves to the next task, or to the new task field when the list is empty.
- Single-key shortcuts are ignored while typing and can be discovered with `?`.
- The constellation only zooms on Ctrl/Cmd + wheel, so it never traps page scrolling.

## Screen readers

- The canvas has `role="img"` with a live summary ("Constellation of 6 tasks, 2 complete…"). The task list is the full equivalent of the picture.
- A polite live region announces added, completed, deleted, restored and imported tasks, and timer start and finish.
- Errors use `role="alert"`, set `aria-invalid` and are linked with `aria-describedby`.
- Task checkboxes are named by the task title through `aria-labelledby`. Icon buttons carry `aria-label` with the task title.
- The selected task is exposed with `aria-pressed` on its row button.

## Visual design

- Text and interface colours meet AA. `contrast.test.js` reads the tokens and fails the build if any pair drops below 4.5:1 (text) or 3:1 (interface).
- State is never colour only: completed tasks have a check mark, strike-through and the word "Completed"; overdue tasks say "Overdue since…"; priority is written out.
- Touch targets are 44 px (checkbox hit area included).
- Layout works from 320 px wide to large desktop. Text can be resized to 200% without loss.
- `prefers-reduced-motion`: animations stop, the sky draws still frames and no particles are emitted.
- `prefers-contrast: more` strengthens borders and muted text. `forced-colors` (Windows High Contrast) keeps the checkbox and pills visible.

## Testing

| Check | How |
| --- | --- |
| Automated rules | axe-core (WCAG 2.0/2.1/2.2 A and AA plus best practices) on desktop and mobile widths: 0 violations |
| Lighthouse accessibility | 100 |
| Contrast | `npm test` (`contrast.test.js`) |
| Structure | `npm test` (`project.test.js`): labels, unique ids, one h1, skip link |

Automated tools find roughly a third of accessibility problems. Before a release, also try: keyboard-only use, a screen reader (NVDA, VoiceOver), 200% zoom and reduced motion.

## Known gaps

- The constellation itself cannot be navigated star by star with the keyboard. The task list provides the same information and actions.
- The timer does not play a sound when a session ends; it announces the result and updates the page title instead.
