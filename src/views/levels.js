// @ts-check
import { h } from '../lib/h.js';
import { TenseName } from '../components/tenseName.js';
import { dueCount } from '../engine/schedule.js';
import { reviewItems } from './review.js';
import { today } from '../engine/schedule.js';

/** @typedef {import('../app.js').App} App */

const CHECK = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** @param {App} app */
export function Levels(app) {
  const { levels } = app.store.progress;
  const done = app.curriculum.levels.filter((l) => levels[l.id]?.completed).length;
  const due = dueCount(reviewItems(app), today());
  return h('section', null,
    h('div', { class: 'page-head' },
      h('h1', null, 'Levels'),
      h('div', { class: 'head-meta' }, `${done} / ${app.curriculum.levels.length}`)),
    due
      ? h('a', { class: 'card due-card', href: '#/review' },
          h('span', null, 'Review'),
          h('span', { class: 'badge' }, String(due)))
      : null,
    h('ol', { class: 'levels' }, app.curriculum.levels.map((l) => {
      const s = levels[l.id];
      return h('li', null,
        h('a', { href: `#/level/${l.id}`, class: `level-row ${s?.completed ? 'complete' : ''}` },
          h('span', { class: 'num', innerHTML: s?.completed ? CHECK : String(l.id) }),
          h('span', { class: 'level-text' },
            h('span', { class: 'level-title' }, l.title),
            h('span', { class: 'level-tenses' }, l.tenses.flatMap((t, i) => (i ? [' · ', TenseName(t)] : [TenseName(t)])))),
          h('span', { class: 'level-score' }, s ? `${Math.round(s.best * 100)}%` : '')));
    })),
  );
}
