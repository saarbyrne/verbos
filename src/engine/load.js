// @ts-check
/** Loads the data files in the browser. */
import { createEngine } from './conjugate.js';

/** @param {string} path */
async function getJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

export async function loadAll() {
  const [verbs, template, additions, alternates, curriculum] = await Promise.all([
    getJson('data/vendor/spanish-verbs/verbs.json'),
    getJson('data/vendor/spanish-verbs/template.json'),
    getJson('data/additions.json'),
    getJson('data/alternates.json'),
    getJson('data/curriculum.json'),
  ]);
  return { engine: createEngine({ verbs, template, additions, alternates }), curriculum };
}
