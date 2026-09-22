// @ts-check
/**
 * Conjugation engine. A port of utils.py and generate_cards() in flashcards.py
 * from github.com/fjarri/spanish-verbs.
 */
import { TENSES, formKeysFor, APP_TENSES } from './tenses.js';

const APP_TENSE_KEYS = APP_TENSES.map((t) => t.key);

/**
 * @typedef {object} VerbEntry
 * @property {string} e_present
 * @property {string} e_present3p
 * @property {string} e_past
 * @property {string} e_pparticiple
 * @property {string} e_gerund
 * @property {string} english_disambiguation
 * @property {'regular'|'to_be_smth'|'to_be'} english_template_type
 * @property {Record<string, string>} irregular_forms
 */

/** @typedef {[Record<string, string>, Record<string, string>]} TemplateEntry */

/**
 * @typedef {object} Form
 * @property {string} infinitive
 * @property {string} formKey
 * @property {string} spanish          correct form, without ¡ and !
 * @property {string} regularSpanish   what the regular pattern would give
 * @property {string} english
 * @property {boolean} irregular
 */

/** @param {string} s */
const clean = (s) => s.replace(/[¡!]/g, '').trim();

/** @param {string} infinitive */
export function splitInfinitive(infinitive) {
  let reflexive = false;
  let inf = infinitive;
  if (inf.endsWith('se')) {
    reflexive = true;
    inf = inf.slice(0, -2);
  }
  const stem = inf.slice(0, -2);
  let ending = inf.slice(-2);
  if (ending === 'ír') ending = 'ir';
  return { infinitive: inf, stem, ending, reflexive };
}

const VOWELS = 'aeoiuáéóíú';
/** @type {Record<string, string>} */
const STRESSED = { a: 'á', e: 'é', o: 'ó', i: 'í', u: 'ú' };

/** Accent the last vowel of a stem. Port of stress_final_vowel. @param {string} stem */
export function stressFinalVowel(stem) {
  const vowels = [];
  for (let i = 0; i < stem.length; i++) if (VOWELS.includes(stem[i])) vowels.push(i);
  if (vowels.length === 0) return stem;
  let last = vowels[vowels.length - 1];
  if (vowels.length > 1) {
    const prev = vowels[vowels.length - 2];
    if (prev + 1 === last && ['ei', 'ia'].includes(stem.slice(prev, prev + 2))) last = prev;
  }
  const v = stem[last];
  if (!(v in STRESSED)) return stem;
  return stem.slice(0, last) + STRESSED[v] + stem.slice(last + 1);
}

/**
 * @param {{ verbs: Record<string, VerbEntry>, template: Record<string, TemplateEntry>, additions?: Record<string, VerbEntry>, alternates?: Record<string, string[]> }} data
 */
export function createEngine({ verbs, template, additions = {}, alternates = {} }) {
  /** @type {Record<string, VerbEntry>} */
  const all = { ...verbs, ...additions };
  const infinitives = Object.keys(all).sort((a, b) => a.localeCompare(b, 'es'));

  /**
   * @param {string} infinitive
   * @param {string} key
   * @param {string} [pparticiple]
   */
  function regularForm(infinitive, key, pparticiple) {
    const { stem, ending, reflexive } = splitInfinitive(infinitive);
    const entry = template[key];
    if (!entry) throw new Error(`Unknown form key: ${key}`);
    let res = entry[1][ending + (reflexive ? 'se' : '')];
    if (res === undefined) throw new Error(`No template for ${infinitive} (${ending}) in ${key}`);
    res = res
      .split('<s_stem_stressed>').join(stressFinalVowel(stem))
      .split('<s_stem>').join(stem)
      .split('<s_pparticiple>').join(pparticiple ?? '<s_pparticiple>');
    return res;
  }

  /** @param {string} infinitive */
  function entryOf(infinitive) {
    const e = all[infinitive];
    if (!e) throw new Error(`Unknown verb: ${infinitive}`);
    return e;
  }

  /** @param {string} infinitive */
  function participle(infinitive) {
    const e = entryOf(infinitive);
    return e.irregular_forms['Participio'] ?? regularForm(infinitive, 'Participio');
  }

  /** @type {Map<string, Form>} */
  const memo = new Map();

  /**
   * @param {string} infinitive
   * @param {string} key
   * @returns {Form}
   */
  function conjugate(infinitive, key) {
    const id = `${infinitive}|${key}`;
    const hit = memo.get(id);
    if (hit) return hit;
    const form = build(infinitive, key);
    memo.set(id, form);
    return form;
  }

  /**
   * @param {string} infinitive
   * @param {string} key
   * @returns {Form}
   */
  function build(infinitive, key) {
    const e = entryOf(infinitive);
    const tpl = template[key];
    if (!tpl) throw new Error(`Unknown form key: ${key}`);
    const regularPp = regularForm(infinitive, 'Participio');
    const pp = participle(infinitive);
    const irregular = key in e.irregular_forms;
    const spanish = irregular ? e.irregular_forms[key] : regularForm(infinitive, key, pp);
    // The regular form uses the regular participle, so compound tenses of verbs
    // with an irregular participle show as irregular too.
    const regularSpanish = regularForm(infinitive, key, regularPp);
    let english = tpl[0][e.english_template_type];
    english = english
      .split('<e_present3p>').join(e.e_present3p)
      .split('<e_present>').join(e.e_present)
      .split('<e_past>').join(e.e_past)
      .split('<e_gerund>').join(e.e_gerund)
      .split('<e_pparticiple>').join(e.e_pparticiple);
    const s = clean(spanish);
    const r = clean(regularSpanish);
    return {
      infinitive,
      formKey: key,
      spanish: s,
      regularSpanish: r,
      english,
      irregular: s !== r,
    };
  }

  /** @param {string} infinitive */
  function allForms(infinitive) {
    return TENSES.flatMap((t) => formKeysFor(t.key)).map((k) => conjugate(infinitive, k));
  }

  /**
   * Extra accepted answers for a form (accent variants and the like).
   * @param {string} infinitive
   * @param {string} key
   */
  function alternatesFor(infinitive, key) {
    return (alternates[`${infinitive}|${key}`] ?? []).map(clean);
  }

  /** @type {Map<string, string[]> | null} */
  let byEnglish = null;
  /**
   * Other verbs with the same English meaning and no disambiguation note.
   * A translate prompt accepts their forms too.
   * @param {string} infinitive
   */
  function synonyms(infinitive) {
    if (!byEnglish) {
      byEnglish = new Map();
      for (const v of infinitives) {
        const e = all[v];
        if (e.english_disambiguation) continue;
        const k = `${e.e_present}|${e.english_template_type}`;
        byEnglish.set(k, [...(byEnglish.get(k) ?? []), v]);
      }
    }
    const e = entryOf(infinitive);
    if (e.english_disambiguation) return [];
    return (byEnglish.get(`${e.e_present}|${e.english_template_type}`) ?? []).filter((v) => v !== infinitive);
  }

  /** "to have" @param {string} infinitive */
  function meaning(infinitive) {
    const e = entryOf(infinitive);
    return `to ${e.e_present}`;
  }

  /** @param {string} infinitive */
  function note(infinitive) {
    return entryOf(infinitive).english_disambiguation;
  }

  /**
   * True if the verb has any irregular form in the app's tenses.
   * @param {string} infinitive
   * @param {string[]} [tenseKeys]
   */
  function hasIrregular(infinitive, tenseKeys) {
    if (!tenseKeys) {
      let v = irregularMemo.get(infinitive);
      if (v === undefined) {
        v = APP_TENSE_KEYS.some((t) => formKeysFor(t).some((k) => conjugate(infinitive, k).irregular));
        irregularMemo.set(infinitive, v);
      }
      return v;
    }
    return tenseKeys.some((t) => formKeysFor(t).some((k) => conjugate(infinitive, k).irregular));
  }
  /** @type {Map<string, boolean>} */
  const irregularMemo = new Map();

  return {
    infinitives,
    has: (/** @type {string} */ inf) => inf in all,
    entry: entryOf,
    conjugate,
    allForms,
    regularForm,
    alternatesFor,
    meaning,
    note,
    hasIrregular,
    synonyms,
    isReflexive: (/** @type {string} */ inf) => inf.endsWith('se'),
  };
}

/** @typedef {ReturnType<typeof createEngine>} Engine */
