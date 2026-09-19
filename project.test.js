/**
 * Structural checks on the shipped files: every element the code looks up
 * exists, the offline cache list is complete, and nothing loads from the network.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = new URL('.', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const files = readdirSync(root);
const cssFiles = files.filter((f) => f.endsWith('.css'));

const html = read('index.html');
const jsFiles = files.filter((f) => f.endsWith('.js') && !f.endsWith('.test.js') && !['sw.js', 'serve.js', 'eslint.config.js'].includes(f));

describe('index.html', () => {
  it('declares language, viewport, title, description and a CSP', () => {
    assert.match(html, /<html lang="en"/);
    assert.match(html, /name="viewport"/);
    assert.match(html, /<title>[^<]{10,}<\/title>/);
    assert.match(html, /name="description"/);
    assert.match(html, /Content-Security-Policy/);
  });
  it('has exactly one h1, one main and a skip link', () => {
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    assert.equal((html.match(/<main[ >]/g) || []).length, 1);
    assert.match(html, /class="skip-link" href="#main"/);
  });
  it('has unique ids', () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, 'duplicate id found');
  });
  it('contains every id the scripts look up with byId()', () => {
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const wanted = new Set(jsFiles.flatMap((f) => [...read(f).matchAll(/byId\('([^']+)'\)/g)].map((m) => m[1])));
    for (const id of wanted) assert.ok(ids.has(id), `#${id} is used in JS but missing from index.html`);
  });
  it('labels every form control', () => {
    const inputs = [...html.matchAll(/<(input|select|textarea)\s[^>]*id="([^"]+)"[^>]*>/g)].filter((m) => !/type="(hidden|radio|checkbox|file)"/.test(m[0]));
    for (const [, , id] of inputs) assert.match(html, new RegExp(`for="${id}"`), `no <label for="${id}">`);
  });
  it('uses no inline styles or event handlers (required by the CSP)', () => {
    assert.doesNotMatch(html.replace(/<template[\s\S]*?<\/template>/g, ''), /\sstyle="/);
    assert.doesNotMatch(html, /\son[a-z]+="/);
  });
  it('loads nothing from another origin', () => {
    const urls = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
    const allowed = urls.filter((u) => !u.startsWith('http://www.w3.org/'));
    assert.deepEqual(allowed, []);
  });
  it('references files that exist', () => {
    for (const [, path] of html.matchAll(/(?:src|href)="((?!#|https?:|data:)[^"]+)"/g)) {
      assert.ok(existsSync(join(root, path)), `${path} is referenced but missing`);
    }
  });
});

describe('service worker', () => {
  it('precaches every js, css and icon file', () => {
    const sw = read('sw.js');
    const list = sw.slice(sw.indexOf('const SHELL'), sw.indexOf('];'));
    const shell = new Set([...list.matchAll(/'([^']+)'/g)].map((m) => m[1]));
    for (const f of [...jsFiles, ...cssFiles, 'icon-192.png', 'icon-512.png']) {
      assert.ok(shell.has(f), `${f} is not in the offline cache list`);
    }
    for (const f of shell) if (f !== './' && !f.startsWith('focuslist')) assert.ok(existsSync(join(root, f)), `${f} in cache list does not exist`);
  });
});

describe('manifest', () => {
  it('is valid JSON with required install fields and real icons', () => {
    const m = JSON.parse(read('manifest.webmanifest'));
    for (const key of ['name', 'short_name', 'start_url', 'display', 'icons']) assert.ok(m[key], `${key} missing`);
    for (const icon of m.icons) assert.ok(existsSync(join(root, icon.src)), `${icon.src} missing`);
  });
});

describe('source hygiene', () => {
  it('has no innerHTML assignments (XSS guard)', () => {
    for (const f of jsFiles) assert.doesNotMatch(read(f), /\.innerHTML\s*=/, `${f} assigns innerHTML`);
  });
  it('has no eval or document.write', () => {
    for (const f of jsFiles) assert.doesNotMatch(read(f), /\beval\(|document\.write\(/, f);
  });
  it('has no hard-coded hex colours in the component stylesheets', () => {
    for (const f of ['base.css', 'layout.css', 'components.css']) {
      assert.doesNotMatch(read(f), /#[0-9a-fA-F]{3,8}\b(?!.*var)/, `${f} should use tokens`);
    }
  });
});
