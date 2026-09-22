// @ts-check
/** Question pools and prompts. */
import { formKeysFor, parseFormKey, PROMPT_PRONOUNS, IMPERATIVE_PRONOUNS, TENSE_BY_KEY } from './tenses.js';

/** @typedef {import('./tenses.js').Person} Person */
/** @typedef {import('./conjugate.js').Engine} Engine */
/** @typedef {import('./conjugate.js').Form} Form */
/** @typedef {'conjugate'|'translate'} PromptType */

/**
 * @typedef {object} Question
 * @property {string} id           `${infinitive}|${formKey}`
 * @property {Form} form
 * @property {string[]} alternates
 * @property {PromptType} type
 * @property {string | null} pronoun
 */

/** @param {string} infinitive @param {string} key */
export const itemId = (infinitive, key) => `${infinitive}|${key}`;

/** @param {string} id */
export function splitId(id) {
  const i = id.indexOf('|');
  return { infinitive: id.slice(0, i), formKey: id.slice(i + 1) };
}

/**
 * @param {{ verbs: string[], tenses: string[], persons?: Person[], vosotros: boolean }} opts
 * @returns {{ infinitive: string, formKey: string }[]}
 */
export function buildPool({ verbs, tenses, persons, vosotros }) {
  const out = [];
  for (const v of verbs) {
    for (const t of tenses) {
      for (const k of formKeysFor(t)) {
        const { person } = parseFormKey(k);
        if (person) {
          if (!vosotros && person === '2p') continue;
          if (persons && persons.length && !persons.includes(person)) continue;
        }
        out.push({ infinitive: v, formKey: k });
      }
    }
  }
  return out;
}

/**
 * @template T
 * @param {T[]} arr
 * @param {() => number} rng
 */
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick n items. If the pool is smaller than n, items repeat.
 * @template T
 * @param {T[]} pool
 * @param {number} n
 * @param {() => number} [rng]
 */
export function sample(pool, n, rng = Math.random) {
  if (!pool.length) return [];
  const out = [];
  while (out.length < n) out.push(...shuffle(pool, rng));
  return out.slice(0, n);
}

/**
 * @param {string} key
 * @param {() => number} rng
 */
export function pronounFor(key, rng = Math.random) {
  const { tense, person } = parseFormKey(key);
  if (!person) return null;
  const set = TENSE_BY_KEY[tense]?.imperative ? IMPERATIVE_PRONOUNS[person] : PROMPT_PRONOUNS[person];
  return set[Math.floor(rng() * set.length)] ?? null;
}

/**
 * @param {Engine} engine
 * @param {{ infinitive: string, formKey: string }} item
 * @param {PromptType | 'mixed'} type
 * @param {() => number} [rng]
 * @returns {Question}
 */
export function makeQuestion(engine, item, type, rng = Math.random) {
  const form = engine.conjugate(item.infinitive, item.formKey);
  const { person } = parseFormKey(item.formKey);
  /** @type {PromptType} */
  let t = type === 'mixed' ? (rng() < 0.5 ? 'conjugate' : 'translate') : type;
  // Participle and gerund have too little English to translate from.
  if (!person) t = 'conjugate';
  const alternates = engine.alternatesFor(item.infinitive, item.formKey);
  if (t === 'translate') {
    for (const v of engine.synonyms(item.infinitive)) {
      alternates.push(engine.conjugate(v, item.formKey).spanish, ...engine.alternatesFor(v, item.formKey));
    }
  }
  return {
    id: itemId(item.infinitive, item.formKey),
    form,
    alternates,
    type: t,
    pronoun: pronounFor(item.formKey, rng),
  };
}
