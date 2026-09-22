// @ts-check
/** Renders lesson Markdown with {{table verb… "Tense"}} directives. */
import { h } from '../lib/h.js';
import { marked } from '../lib/marked.esm.js';
import { VerbTable } from './verbTable.js';

/** @typedef {import('../app.js').App} App */

/** @type {Map<string, string>} */
const cache = new Map();

/** @param {string} file */
async function fetchLesson(file) {
  const hit = cache.get(file);
  if (hit) return hit;
  const res = await fetch(`content/lessons/${file}`);
  if (!res.ok) throw new Error(`Lesson ${file} not found`);
  const text = await res.text();
  cache.set(file, text);
  return text;
}

/** @param {string} arg */
export function parseDirective(arg) {
  const tense = arg.match(/"([^"]+)"/)?.[1] ?? '';
  const verbs = arg.replace(/"[^"]+"/, '').trim().split(/\s+/).filter(Boolean);
  return { tense, verbs };
}

/**
 * @param {App} app
 * @param {string} file
 */
export function Lesson(app, file) {
  const el = h('article', { class: 'lesson' });
  fetchLesson(file).then((md) => {
    /** @type {{ tense: string, verbs: string[] }[]} */
    const tables = [];
    const withSlots = md.replace(/\{\{table ([^}]+)\}\}/g, (_, arg) => {
      tables.push(parseDirective(arg));
      return `<div data-slot="${tables.length - 1}"></div>`;
    });
    // The first heading is shown by the level view.
    el.innerHTML = /** @type {string} */ (marked.parse(withSlots.replace(/^# .*\n/, '')));
    el.querySelectorAll('[data-slot]').forEach((slot) => {
      const t = tables[Number(/** @type {HTMLElement} */ (slot).dataset.slot)];
      slot.replaceWith(VerbTable(app, { verbs: t.verbs, tense: t.tense, endings: true, english: false }));
    });
  }).catch((err) => {
    el.textContent = String(err.message ?? err);
  });
  return el;
}
