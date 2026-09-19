/**
 * Verifies the design tokens meet WCAG 2.2 contrast requirements, reading the
 * real values out of css/tokens.css so the test cannot drift from the styles.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const token = (name) => {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `token --${name} should be a 6-digit hex colour`);
  return match[1];
};

const channel = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const AA_TEXT = 4.5;
const AA_UI = 3;

describe('colour contrast (WCAG 2.2 AA)', () => {
  const surfaces = ['color-void', 'color-panel', 'color-raised'];

  for (const surface of surfaces) {
    it(`body and muted text on ${surface}`, () => {
      assert.ok(ratio(token('color-text'), token(surface)) >= AA_TEXT);
      assert.ok(ratio(token('color-text-muted'), token(surface)) >= AA_TEXT);
    });
    it(`accent, sage and danger text on ${surface}`, () => {
      for (const c of ['color-accent', 'color-sage', 'color-danger']) {
        assert.ok(ratio(token(c), token(surface)) >= AA_TEXT, `${c} on ${surface}`);
      }
    });
    it(`priority colours are visible on ${surface}`, () => {
      for (const c of ['priority-high', 'priority-medium', 'priority-low', 'color-done']) {
        assert.ok(ratio(token(c), token(surface)) >= AA_TEXT, `${c} on ${surface}`);
      }
    });
  }

  it('dark text on filled accent buttons and priority pills', () => {
    for (const bg of ['color-accent-strong', 'color-accent-hover', 'priority-high', 'priority-medium', 'priority-low']) {
      assert.ok(ratio(token('color-on-accent'), token(bg)) >= AA_TEXT, `on-accent on ${bg}`);
    }
  });

  it('the accent focus ring is visible against every surface (non-text 3:1)', () => {
    for (const surface of surfaces) assert.ok(ratio(token('color-accent'), token(surface)) >= AA_UI);
  });
});
