import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './helpers.js';

const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const css = readFileSync(join(ROOT, 'src/styles.css'), 'utf8');

test('the page loads no fonts from another site', () => {
  assert.doesNotMatch(html, /fonts\.bunny\.net|fonts\.googleapis\.com/);
  assert.doesNotMatch(css, /https?:\/\//);
});

test('the brand fonts have font files in the app', () => {
  const files = [...css.matchAll(/@font-face[^}]*url\("([^"]+)"\)/g)].map((m) => m[1]);
  for (const f of files) assert.ok(existsSync(join(ROOT, 'src', f)), f);
  for (const family of ['Bricolage Grotesque', 'Instrument Sans', 'JetBrains Mono']) {
    assert.ok(css.includes(`@font-face { font-family: "${family}"`), family);
  }
});
