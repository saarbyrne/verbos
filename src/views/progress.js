// @ts-check
import { h } from '../lib/h.js';
import { APP_TENSES, parseFormKey } from '../engine/tenses.js';
import { dueCount, today } from '../engine/schedule.js';
import { splitId } from '../engine/quiz.js';
import { reviewItems } from './review.js';
import { TenseName } from '../components/tenseName.js';

/** @typedef {import('../app.js').App} App */

/** @param {App} app */
export function Progress(app) {
  const items = reviewItems(app);
  const levels = app.store.progress.levels;
  const done = app.curriculum.levels.filter((l) => levels[l.id]?.completed).length;

  /** @type {Record<string, { seen: number, correct: number, items: number }>} */
  const byTense = {};
  for (const s of items) {
    const { tense } = parseFormKey(splitId(s.id).formKey);
    const t = (byTense[tense] ??= { seen: 0, correct: 0, items: 0 });
    t.seen += s.seen;
    t.correct += s.correct;
    t.items += 1;
  }
  const boxes = [1, 2, 3, 4, 5].map((b) => items.filter((s) => s.box === b).length);
  const maxBox = Math.max(1, ...boxes);

  const file = /** @type {HTMLInputElement} */ (h('input', { type: 'file', accept: 'application/json,.json', hidden: true }));
  const message = h('div', { class: 'sub', 'aria-live': 'polite' });
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      app.store.importData(JSON.parse(await f.text()));
      location.hash = `#/progress?r=${Date.now()}`;
    } catch (err) {
      message.textContent = String(/** @type {Error} */ (err).message ?? err);
    }
  });

  function exportFile() {
    const blob = new Blob([JSON.stringify(app.store.exportData(), null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `verbos-progress-${today()}.json` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(/** @type {HTMLAnchorElement} */ (a).href), 1000);
  }

  return h('section', null,
    h('div', { class: 'page-head' }, h('h1', null, 'Progress')),
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, `${done} / ${app.curriculum.levels.length}`), h('div', { class: 'stat-label' }, 'Levels complete')),
      h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, String(items.length)), h('div', { class: 'stat-label' }, 'Items learned')),
      h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, String(dueCount(items, today()))), h('div', { class: 'stat-label' }, 'Due today'))),
    h('div', { class: 'card' },
      h('h2', null, 'Boxes'),
      h('div', { class: 'boxes' }, boxes.map((n, i) =>
        h('div', { class: 'box' },
          h('div', { class: 'box-bar' }, n ? h('span', { style: `height:${(n / maxBox) * 100}%` }) : null),
          h('div', { class: 'box-num' }, String(n)),
          h('div', { class: 'box-label' }, `Box ${i + 1}`))))),
    h('div', { class: 'card' },
      h('h2', null, 'Accuracy'),
      h('table', { class: 'acc' },
        h('thead', null, h('tr', null, h('th', null, 'Tense'), h('th', { class: 'n' }, 'Items'), h('th', { class: 'n' }, 'Accuracy'))),
        h('tbody', null, APP_TENSES.filter((t) => byTense[t.key]).map((t) => {
          const s = byTense[t.key];
          const pct = Math.round((s.correct / s.seen) * 100);
          return h('tr', null,
            h('td', null, TenseName(t.key)),
            h('td', { class: 'n' }, String(s.items)),
            h('td', { class: 'n' }, h('span', { class: 'meter' }, h('span', { style: `width:${pct}%` })), ` ${pct}%`));
        })))),
    h('div', { class: 'card' },
      h('h2', null, 'Backup'),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn', onclick: exportFile }, 'Export'),
        h('button', { type: 'button', class: 'btn', onclick: () => file.click() }, 'Import'),
        file),
      message),
  );
}
