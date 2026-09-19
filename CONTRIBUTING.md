# Contributing

Thanks for helping improve FocusList.

## Set up

```bash
npm install
npm start        # http://localhost:8080
npm run check    # lint + tests
```

## Ground rules

1. **Keep logic out of the DOM code.** New behaviour goes in a pure module first, with tests, then gets wired to the interface.
2. **No dependencies at runtime.** Dev tooling is fine.
3. **Use tokens.** Colours, sizes and durations come from `tokens.css`. If you add a colour, `npm test` checks its contrast.
4. **Never assign `innerHTML`.** Use `textContent`, `.value` or DOM methods.
5. **Keep it accessible.** New controls need a label, a visible focus state and keyboard support. Run axe before opening a pull request.
6. **Add new files to `sw.js`** so they work offline (a test reminds you).

## Style

- ES modules, `const` by default, no `var`, strict equality. ESLint enforces this.
- Small functions with a one-line comment when the reason is not obvious.
- JSDoc types on exported functions.
- CSS class names use `block__element--modifier`.

## Pull requests

- One change per pull request, with a short description of what and why.
- Include tests for logic changes and a screenshot for visual changes.
- Update `CHANGELOG.md` under "Unreleased".
