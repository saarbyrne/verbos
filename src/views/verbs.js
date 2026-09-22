// @ts-check
import { h, replace } from '../lib/h.js';
import { stripDiacritics } from '../engine/check.js';
import { APP_TENSES, MOODS } from '../engine/tenses.js';
import { VerbTable } from '../components/verbTable.js';
import { MoodName } from '../components/tenseName.js';

/** @typedef {import('../app.js').App} App */

let lastQuery = '';

/** @param {App} app */
export function Verbs(app) {
  const input = /** @type {HTMLInputElement} */ (h('input', { class: 'input', type: 'search', placeholder: 'Search', value: lastQuery, lang: 'es', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Search verbs' }));
  const list = h('ul', { class: 'verb-list' });
  const count = h('div', { class: 'head-meta' });

  function render() {
    lastQuery = input.value;
    const q = stripDiacritics(input.value.trim().toLowerCase());
    const hits = app.engine.infinitives.filter((v) => {
      if (!q) return true;
      const e = app.engine.entry(v);
      return stripDiacritics(v).includes(q) || e.e_present.toLowerCase().includes(q);
    });
    count.textContent = String(hits.length);
    replace(list, hits.map((v) =>
      h('li', null, h('a', { href: `#/verbs/${encodeURIComponent(v)}` },
        h('span', { class: 'inf', lang: 'es' }, v),
        h('span', { class: 'muted' }, app.engine.meaning(v)),
        app.engine.hasIrregular(v) ? h('span', { class: 'tag' }, 'irregular') : null))));
  }
  input.addEventListener('input', render);
  render();
  requestAnimationFrame(() => input.focus());
  return h('section', null,
    h('div', { class: 'page-head' }, h('h1', null, 'Verbs'), count),
    h('div', { class: 'search sticky-top' }, input),
    list);
}

/** @param {App} app @param {string} infinitive */
export function Verb(app, infinitive) {
  if (!app.engine.has(infinitive)) return h('p', null, 'Verb not found');
  const note = app.engine.note(infinitive);
  return h('section', null,
    h('div', { class: 'page-head' },
      h('div', null,
        h('a', { class: 'eyebrow', href: '#/verbs' }, 'Verbs'),
        h('h1', { lang: 'es' }, infinitive),
        h('div', { class: 'muted' }, app.engine.meaning(infinitive), note ? ` (${note})` : '')),
      h('div', { class: 'chips' },
        app.engine.hasIrregular(infinitive) ? h('span', { class: 'tag' }, 'irregular') : null,
        app.engine.isReflexive(infinitive) ? h('span', { class: 'tag' }, 'reflexive') : null)),
    MOODS.map((m) => h('div', { class: 'mood' },
      h('h2', null, MoodName(m)),
      h('div', { class: 'tables' }, APP_TENSES.filter((t) => t.mood === m).map((t) => VerbTable(app, { verbs: [infinitive], tense: t.key, link: false }))))),
  );
}
