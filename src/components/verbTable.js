// @ts-check
/** Verb table used in the library, lessons and quiz feedback. */
import { h, segments } from '../lib/h.js';
import { TENSE_BY_KEY, personsFor, formKey, PERSON_LABEL } from '../engine/tenses.js';
import { diffSegments, endingSegments } from '../engine/diff.js';
import { splitInfinitive } from '../engine/conjugate.js';

/** @typedef {import('../engine/conjugate.js').Form} Form */
/** @typedef {import('../app.js').App} App */

/**
 * A form with irregular letters marked, or the ending marked when `endings` is on.
 * @param {Form} form
 * @param {boolean} [endings]
 */
export function FormText(form, endings = false) {
  if (form.irregular) return h('span', { class: 'form' }, segments(diffSegments(form.spanish, form.regularSpanish), 'irr'));
  if (endings) {
    const segs = endingSegments(form.spanish, splitInfinitive(form.infinitive).stem);
    if (segs) return h('span', { class: 'form' }, segments(segs, 'end'));
  }
  return h('span', { class: 'form' }, form.spanish);
}

/**
 * @param {App} app
 * @param {{ verbs: string[], tense: string, endings?: boolean, english?: boolean, caption?: boolean, link?: boolean }} opts
 */
export function VerbTable(app, { verbs, tense, endings = false, english = verbs.length === 1, caption = true, link = true }) {
  const t = TENSE_BY_KEY[tense];
  const persons = personsFor(tense).filter((p) => app.store.settings.vosotros || p !== '2p');
  const keys = t.personal ? persons.map((p) => ({ label: PERSON_LABEL[p], key: formKey(tense, p) })) : [{ label: '', key: tense }];
  const multi = verbs.length > 1;

  const head = multi
    ? h('thead', null, h('tr', null, t.personal ? h('th', null) : h('th', null), verbs.map((v) => h('th', null, link ? h('a', { href: `#/verbs/${encodeURIComponent(v)}` }, v) : v))))
    : null;

  const rows = keys.map(({ label, key }) =>
    h('tr', null,
      t.personal || multi ? h('th', { scope: 'row', class: 'person' }, label) : null,
      verbs.map((v) => {
        const f = app.engine.conjugate(v, key);
        return h('td', null, FormText(f, endings), english && !multi ? h('div', { class: 'en' }, f.english) : null);
      }),
    ),
  );

  return h('figure', { class: 'vt' },
    caption ? h('figcaption', { title: t.en }, h('span', { class: 'vt-es' }, t.es), h('span', { class: 'vt-en' }, t.ex)) : null,
    h('div', { class: 'vt-scroll' }, h('table', null, head, h('tbody', null, rows))),
  );
}
