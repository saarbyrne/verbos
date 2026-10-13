import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { precacheList, render, renderPreload, walk, importSpecifiers, dataFiles, ROOT } from '../scripts/precache.mjs';

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

test('imports are found whether they span lines, re-export or use double quotes', () => {
  const src = [
    "import a from './a.js';",
    'import b from "./b.js";',
    "import './side.js';",
    'import {',
    '  c,',
    '  d,',
    "} from './multi.js';",
    "export { e } from './reexport.js';",
    'export * from "../up/star.js";',
    "import fs from 'node:fs';",
    "/** @typedef {import('./type-only.js').T} T */",
    "export const x = { from: 'not a module' };",
    "const y = import('./dynamic.js');",
  ].join('\n');
  assert.deepEqual(importSpecifiers(src), ['./a.js', './b.js', './side.js', './multi.js', './reexport.js', '../up/star.js']);
});

test('data files are found in any kind of quote', () => {
  const src = `fetch('data/a.json'); fetch("data/b.json"); fetch(\`data/c.json\`); fetch('content/x.md'); 'data/mismatched"`;
  assert.deepEqual(dataFiles(src), ['data/a.json', 'data/b.json', 'data/c.json']);
});

/** Source without comments, so a path that is only mentioned in one is not counted. @param {string} file */
function code(file) {
  return readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

// A second, looser reading of the sources than the generator's: any quoted
// relative .js path or data/ path in the code counts, wherever it sits.
test('every module the app imports and every data file it fetches is preloaded', () => {
  const sources = walk(join(ROOT, 'src')).filter((f) => f.endsWith('.js'));
  const fetched = new Set(sources.flatMap((f) => [...code(f).matchAll(/['"`](data\/[^'"`$]+)['"`]/g)].map((m) => m[1])));
  assert.deepEqual(new Set(hrefs('preload')), fetched);
  const modules = new Set(hrefs('modulepreload'));
  for (const f of sources) {
    for (const [, spec] of code(f).matchAll(/['"](\.{1,2}\/[^'"]+\.js)['"]/g)) {
      const dep = posix.join(posix.dirname(relative(ROOT, f).split(sep).join('/')), spec);
      if (dep !== 'src/main.js') assert.ok(modules.has(dep), `${dep} is imported by ${f} but not preloaded`);
    }
  }
});
