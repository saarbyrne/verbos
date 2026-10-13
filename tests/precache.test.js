import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { precacheList, render, renderPreload, walk, ROOT } from '../scripts/precache.mjs';

test('sw.js precache list matches the files on disk (run npm run precache)', () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  assert.ok(sw.includes(render(precacheList())), 'sw.js precache list is out of date');
});

const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const hrefs = (/** @type {string} */ rel) => [...html.matchAll(new RegExp(`<link rel="${rel}" href="([^"]+)"`, 'g'))].map((m) => m[1]);

test('index.html preload tags match the scripts and data files (run npm run precache)', () => {
  assert.ok(html.includes(renderPreload()), 'index.html preload tags are out of date');
});

test('every preload tag points at a file that exists', () => {
  const all = [...hrefs('modulepreload'), ...hrefs('preload')];
  assert.ok(all.length > 0);
  for (const f of all) assert.ok(existsSync(join(ROOT, f)), f);
});

test('every module the app imports and every data file it fetches is preloaded', () => {
  const sources = walk(join(ROOT, 'src')).filter((f) => f.endsWith('.js'));
  const fetched = new Set(sources.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/'(data\/[\w./-]+)'/g)].map((m) => m[1])));
  assert.deepEqual(new Set(hrefs('preload')), fetched);
  const modules = new Set(hrefs('modulepreload'));
  for (const f of sources) {
    for (const [, spec] of readFileSync(f, 'utf8').matchAll(/^import\b[^'"\n]*['"](\.[^'"]+)['"]/gm)) {
      const dep = posix.join(posix.dirname(relative(ROOT, f).split(sep).join('/')), spec);
      if (dep !== 'src/main.js') assert.ok(modules.has(dep), `${dep} is imported by ${f} but not preloaded`);
    }
  }
});
