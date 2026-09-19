# Architecture

FocusList follows a small, one-way data flow. State changes only through the store; the interface re-renders from state.

```text
   user input ──► ui-* handlers ──► store actions ──► new immutable state
                                                            │
        localStorage ◄── storage.save ◄── subscriber ◄──────┤
                                                            ▼
                     render(): task list · stats · selection · constellation · timer menu
```

## Layers

| Layer | Files | Rules |
| --- | --- | --- |
| Pure logic | `taskModel.js`, `filters.js`, `timer.js`, `utils.js` | No DOM, no I/O. Input in, value out. Unit tested. |
| State | `store.js` | Holds tasks, filters and selection. Every update creates new objects. Notifies subscribers with `(state, prevState)`. |
| Persistence | `storage.js` | Reads, writes, migrates, validates, exports, imports. The storage backend is injected so tests use memory. |
| Interface | `ui-*.js` | Each module owns one area of the page. Modules receive callbacks; they never import each other. |
| Visuals | `cosmos-*.js` | Canvas drawing. Receives data through `update()`; reports clicks through `onPick`. |
| Composition | `main.js` | The only file that knows about all the others. |

## The store

`createStore(tasks)` returns `getState`, `subscribe` and named actions (`addTask`, `updateTask`, `toggleTask`, `removeTask`, `clearCompleted`, `replaceAll`, `addFocusTime`, `setFilters`, `select`, `undo`).

Actions that can fail (`addTask`, `updateTask`) return `{ ok, error }` so forms can show the message. Validation happens in the store, so there is one source of truth for the rules.

### Undo

Destructive actions (`removeTask`, `clearCompleted`, `replaceAll`) save a snapshot of the previous list. `undo()` restores it once. Any other change to the tasks discards the snapshot, so undo can never overwrite newer edits.

## Rendering

`main.js` subscribes one `render` function. It skips work that cannot have changed (statistics and the timer menu only recompute when the task array changed by reference).

The task list reuses one `<li>` per task and moves rows into order with `insertBefore`. Focus, scroll position and CSS animations therefore survive updates, and after a delete the focus moves to the neighbouring row.

## The constellation

`createConstellation(canvas, options)` keeps its own node map. `update({ tasks, visibleIds, selectedId })` syncs nodes; the animation loop draws them.

- Each task is assigned to one of three orbits. Its position is an angle that advances slowly with time.
- Star size shows priority. Completed stars are green and smaller. Filtered-out stars dim to 14% opacity.
- Glow sprites are rendered once per colour and reused, and the percentage label is cached, so a frame costs a handful of `drawImage` calls.
- The loop runs only while the canvas is on screen and the tab is visible. With reduced motion it draws on demand instead of continuously.

## Storage and validation

`normalizeTask` accepts any value and returns a valid task or `null`. It is used for data from `localStorage`, from other tabs and from imported files, so untrusted data goes through one code path. It clamps lengths, checks dates against the calendar, rejects unknown priorities and drops unknown fields.

Schema changes add fields to `normalizeTask` with a default. Bump `SCHEMA_VERSION` only when an old shape needs a real migration.

## Security

- The Content Security Policy in `index.html` allows only same-origin scripts, styles and images.
- No inline scripts, event-handler attributes or `style` attributes exist in the markup (a test checks this).
- User text is only ever inserted with `textContent` or `.value`. A test fails the build if `innerHTML` is assigned.
- Import files are size limited (1 MB), parsed as JSON only and passed through `normalizeList`.

## Extending

| To add… | Do this |
| --- | --- |
| A task field | Add it to `createTask`, `normalizeTask`, `applyPatch`, a form control and a test |
| A filter | Extend `DEFAULT_FILTERS` and `matches()` in `filters.js`, add a control in `ui-filters.js` |
| A new panel | Add markup, create `ui-yourPanel.js` exporting `mountYourPanel`, call it from `main.js` |
| A colour | Add a token in `tokens.css`, then run `npm test` to check contrast |
