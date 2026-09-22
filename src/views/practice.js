// @ts-check
import { h, replace } from '../lib/h.js';
import { APP_TENSES, MOODS, PERSONS, PERSON_LABEL } from '../engine/tenses.js';
import { buildPool, sample, makeQuestion } from '../engine/quiz.js';
import { stripDiacritics } from '../engine/check.js';
import { QuizRunner } from '../components/quizRunner.js';
import { TenseName, MoodName } from '../components/tenseName.js';

/** @typedef {import('../app.js').App} App */
/** @typedef {import('../engine/tenses.js').Person} Person */

const COUNTS = [10, 20, 30, 50];

/** Custom quiz settings, kept for the session. */
const state = {
  tenses: new Set(['Presente Indicativo']),
  /** @type {Set<Person>} */
  persons: new Set(PERSONS),
  /** @type {string[]} */
  verbs: [],
  /** @type {'conjugate'|'translate'|'mixed' | null} */
  promptType: null,
  count: 20,
};

/** @param {App} app */
function initVerbs(app) {
  if (!state.verbs.length) state.verbs = app.top.slice(0, 25);
}

/**
 * @template T
 * @param {Set<T>} set
 * @param {T} v
 */
const toggle = (set, v) => (set.has(v) ? set.delete(v) : set.add(v));

/** @param {App} app */
export function Practice(app) {
  initVerbs(app);
  const root = h('section');
  const search = /** @type {HTMLInputElement} */ (h('input', { class: 'input', type: 'search', placeholder: 'Add a verb', lang: 'es', autocomplete: 'off', spellcheck: 'false' }));
  const results = h('div', { class: 'search-results' });
  const selected = h('div', { class: 'chips' });
  const lists = h('div', { class: 'chips' });
  const listName = /** @type {HTMLInputElement} */ (h('input', { class: 'input', type: 'text', placeholder: 'List name' }));
  const start = h('a', { class: 'btn primary' }, 'Start');
  const tensesBox = h('div');
  const personsBox = h('div', { class: 'chips' });
  const promptBox = h('div', { class: 'segmented' });
  const countBox = h('div', { class: 'segmented' });
  const summary = h('div', { class: 'head-meta' });

  function poolSize() {
    return buildPool({ verbs: state.verbs, tenses: [...state.tenses], persons: [...state.persons], vosotros: app.store.settings.vosotros }).length;
  }

  function renderTenses() {
    replace(tensesBox, MOODS.map((m) => {
      const ts = APP_TENSES.filter((t) => t.mood === m);
      return h('div', { class: 'group' },
        h('div', { class: 'group-label' }, MoodName(m)),
        h('div', { class: 'chips' }, ts.map((t) =>
          h('button', { type: 'button', class: `chip toggle ${state.tenses.has(t.key) ? 'on' : ''}`, 'aria-pressed': String(state.tenses.has(t.key)), onclick: () => { toggle(state.tenses, t.key); update(); } }, TenseName(t.key)))));
    }));
  }

  function renderPersons() {
    const ps = PERSONS.filter((p) => app.store.settings.vosotros || p !== '2p');
    replace(personsBox, ps.map((p) =>
      h('button', { type: 'button', class: `chip toggle ${state.persons.has(p) ? 'on' : ''}`, 'aria-pressed': String(state.persons.has(p)), lang: 'es', onclick: () => { toggle(state.persons, p); update(); } }, PERSON_LABEL[p])));
  }

  function renderSelected() {
    replace(selected, state.verbs.map((v) =>
      h('button', { type: 'button', class: 'chip removable', lang: 'es', title: 'Remove', onclick: () => { state.verbs = state.verbs.filter((x) => x !== v); update(); } }, v, h('span', { 'aria-hidden': 'true' }, ' ×'))));
  }

  function renderLists() {
    replace(lists, app.store.lists.lists.map((l) =>
      h('span', { class: 'chip list-chip' },
        h('button', { type: 'button', class: 'plain', onclick: () => { state.verbs = [...l.verbs]; update(); } }, l.name),
        h('button', { type: 'button', class: 'plain x', 'aria-label': `Delete ${l.name}`, onclick: () => { app.store.deleteList(l.name); renderLists(); } }, '×'))));
  }

  function renderSegmented() {
    const current = state.promptType ?? app.store.settings.promptType;
    replace(promptBox, /** @type {const} */ (['conjugate', 'translate', 'mixed']).map((t) =>
      h('button', { type: 'button', class: current === t ? 'on' : '', 'aria-pressed': String(current === t), onclick: () => { state.promptType = t; update(); } }, t[0].toUpperCase() + t.slice(1))));
    replace(countBox, COUNTS.map((c) =>
      h('button', { type: 'button', class: state.count === c ? 'on' : '', 'aria-pressed': String(state.count === c), onclick: () => { state.count = c; update(); } }, String(c))));
  }

  function renderResults() {
    const q = stripDiacritics(search.value.trim().toLowerCase());
    if (!q) return replace(results);
    const hits = app.engine.infinitives
      .filter((v) => !state.verbs.includes(v) && (stripDiacritics(v).startsWith(q) || app.engine.entry(v).e_present.startsWith(q)))
      .slice(0, 8);
    replace(results, hits.map((v) =>
      h('button', { type: 'button', class: 'result', onclick: () => { state.verbs.push(v); search.value = ''; update(); search.focus(); } },
        h('span', { lang: 'es' }, v), h('span', { class: 'muted' }, app.engine.meaning(v)))));
  }

  /** @param {string[]} verbs */
  function preset(verbs) {
    state.verbs = verbs;
    update();
  }

  function update() {
    renderTenses();
    renderPersons();
    renderSelected();
    renderLists();
    renderSegmented();
    renderResults();
    const size = poolSize();
    summary.textContent = `${state.verbs.length} verbs`;
    const ok = size > 0;
    start.setAttribute('href', ok ? `#/practice/quiz?r=${Date.now()}` : '#/practice');
    start.classList.toggle('disabled', !ok);
    start.setAttribute('aria-disabled', String(!ok));
  }

  search.addEventListener('input', renderResults);
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = /** @type {HTMLButtonElement | null} */ (results.querySelector('.result'));
      first?.click();
    }
  });

  const irregularTop = () => app.top.filter((v) => app.engine.hasIrregular(v, [...state.tenses]));

  replace(root,
    h('div', { class: 'page-head' }, h('h1', null, 'Practice'), summary),
    h('div', { class: 'card form' },
      h('h2', null, 'Tenses'), tensesBox,
      h('h2', null, 'Persons'), personsBox,
      h('h2', null, 'Verbs'),
      h('div', { class: 'chips presets' },
        h('button', { type: 'button', class: 'chip', onclick: () => preset(app.top.slice(0, 25)) }, 'Top 25'),
        h('button', { type: 'button', class: 'chip', onclick: () => preset(app.top.slice(0, 50)) }, 'Top 50'),
        h('button', { type: 'button', class: 'chip', onclick: () => preset(app.top.slice(0, 100)) }, 'Top 100'),
        h('button', { type: 'button', class: 'chip', onclick: () => preset(app.top.slice()) }, 'Top 200'),
        h('button', { type: 'button', class: 'chip', onclick: () => preset(irregularTop()) }, 'Irregular'),
        h('button', { type: 'button', class: 'chip', onclick: () => preset([]) }, 'Clear')),
      h('div', { class: 'search' }, search, results),
      selected,
      h('h2', null, 'Saved lists'),
      lists,
      h('div', { class: 'row' }, listName,
        h('button', { type: 'button', class: 'btn', onclick: () => { const n = listName.value.trim(); if (n && state.verbs.length) { app.store.saveList(n, state.verbs); listName.value = ''; renderLists(); } } }, 'Save')),
      h('h2', null, 'Prompt'), promptBox,
      h('h2', null, 'Questions'), countBox),
    h('div', { class: 'actions sticky' }, start),
  );
  update();
  return root;
}

/** @param {App} app */
export function PracticeQuiz(app) {
  initVerbs(app);
  const { settings } = app.store;
  const pool = buildPool({ verbs: state.verbs, tenses: [...state.tenses], persons: [...state.persons], vosotros: settings.vosotros });
  if (!pool.length) return Practice(app);
  const type = state.promptType ?? settings.promptType;
  const questions = sample(pool, state.count).map((item) => makeQuestion(app.engine, item, type));
  return QuizRunner(app, {
    title: 'Practice',
    questions,
    backHref: '#/practice',
    endActions: () => [
      { label: 'Again', href: `#/practice/quiz?r=${Date.now()}`, primary: true },
      { label: 'Settings', href: '#/practice' },
    ],
  });
}
