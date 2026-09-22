// @ts-check
/** Answer checking. */
import { parseFormKey } from './tenses.js';

/** @typedef {'correct'|'accent'|'wrong'} CheckResult */

const SUBJECT_PRONOUNS = new Set([
  'yo', 'tú', 'tu', 'él', 'el', 'ella', 'usted', 'ud',
  'nosotros', 'nosotras', 'vosotros', 'vosotras',
  'ellos', 'ellas', 'ustedes', 'uds',
]);

/** Lowercase, collapse spaces, remove ¡ ! ¿ ? and punctuation. @param {string} s */
export function normalize(s) {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[¡!¿?.,;:"“”«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Remove accents, tildes and diaeresis. @param {string} s */
export function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

/** Drop a leading subject pronoun if the answer has more than one word. @param {string} s */
export function stripSubjectPronoun(s) {
  const words = s.split(' ');
  if (words.length > 1 && SUBJECT_PRONOUNS.has(words[0])) return words.slice(1).join(' ');
  return s;
}

/**
 * The -se form of an imperfect subjunctive -ra form. Applies to the first word
 * that ends in ra, ras, ramos, rais or ran (the verb itself, or the auxiliary
 * in compound forms). hubiera hablado → hubiese hablado.
 * @param {string} form
 * @returns {string | null}
 */
export function seVariant(form) {
  const words = form.split(' ');
  for (let i = 0; i < words.length; i++) {
    const m = words[i].match(/^(.+)ra(s|mos|is|n)?$/);
    if (m) {
      words[i] = `${m[1]}se${m[2] ?? ''}`;
      return words.join(' ');
    }
  }
  return null;
}

const SE_TENSES = new Set(['Imperfecto Subjuntivo', 'Pluscuamperfecto Subjuntivo']);

/**
 * All accepted spellings for a form, normalised.
 * @param {{ spanish: string, formKey: string }} form
 * @param {string[]} [alternates]
 */
export function acceptedAnswers(form, alternates = []) {
  const { tense } = parseFormKey(form.formKey);
  const base = [form.spanish, ...alternates].map(normalize);
  const out = new Set(base);
  if (SE_TENSES.has(tense)) {
    for (const b of base) {
      const v = seVariant(b);
      if (v) out.add(v);
    }
  }
  if (tense === 'Presente Imperativo Negativo') {
    for (const a of [...out]) if (a.startsWith('no ')) out.add(a.slice(3));
  }
  return [...out];
}

/**
 * @param {string} answer
 * @param {{ spanish: string, formKey: string }} form
 * @param {string[]} [alternates]
 * @returns {CheckResult}
 */
export function check(answer, form, alternates = []) {
  const a = stripSubjectPronoun(normalize(answer));
  if (!a) return 'wrong';
  const accepted = acceptedAnswers(form, alternates);
  if (accepted.includes(a)) return 'correct';
  const bare = stripDiacritics(a);
  if (accepted.some((x) => stripDiacritics(x) === bare)) return 'accent';
  return 'wrong';
}

/**
 * Whether a result counts as right for scoring and review.
 * @param {CheckResult} result
 * @param {'strict'|'lenient'} accentMode
 */
export function countsAsRight(result, accentMode) {
  return result === 'correct' || (result === 'accent' && accentMode === 'lenient');
}
