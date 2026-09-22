// @ts-check
/** Spanish tense name followed by a short English example (I had done). Moods get their English name. */
import { h } from '../lib/h.js';
import { TENSE_BY_KEY, MOOD_EN } from '../engine/tenses.js';

/** @param {string} key tense key */
export function TenseName(key) {
  const t = TENSE_BY_KEY[key];
  return h('span', { class: 'tn', title: t.en }, h('span', { lang: 'es' }, t.es), ' ', h('span', { class: 'tn-en' }, t.ex));
}

/** @param {string} key tense key */
export function tenseText(key) {
  const t = TENSE_BY_KEY[key];
  return `${t.es} (${t.ex})`;
}

/** @param {import('../engine/tenses.js').Mood} mood */
export function MoodName(mood) {
  return h('span', { class: 'tn' }, h('span', { lang: 'es' }, mood), ' ', h('span', { class: 'tn-en' }, MOOD_EN[mood]));
}
