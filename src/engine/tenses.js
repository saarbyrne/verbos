// @ts-check
/** Tense and person metadata. Keys match template.json in fjarri/spanish-verbs. */

/** @typedef {'1s'|'2s'|'3s'|'1p'|'2p'|'3p'} Person */
/** @typedef {'Indicativo'|'Subjuntivo'|'Imperativo'|'Formas no personales'} Mood */

/**
 * @typedef {object} Tense
 * @property {string} key      tense name as used in form keys
 * @property {Mood} mood
 * @property {string} es       Spanish display name
 * @property {string} en       English display name
 * @property {string} ex       short English example of the meaning
 * @property {boolean} personal   false for Participio and Gerundio
 * @property {boolean} imperative
 * @property {boolean} inApp   false for tenses left out of the app
 */

/** @type {Tense[]} */
export const TENSES = [
  { key: 'Presente Indicativo', mood: 'Indicativo', es: 'Presente', en: 'Present', ex: 'I do', personal: true, imperative: false, inApp: true },
  { key: 'Pretérito Indicativo', mood: 'Indicativo', es: 'Indefinido', en: 'Preterite', ex: 'I did', personal: true, imperative: false, inApp: true },
  { key: 'Imperfecto Indicativo', mood: 'Indicativo', es: 'Imperfecto', en: 'Imperfect', ex: 'I used to do', personal: true, imperative: false, inApp: true },
  { key: 'Futuro Indicativo', mood: 'Indicativo', es: 'Futuro', en: 'Future', ex: 'I will do', personal: true, imperative: false, inApp: true },
  { key: 'Condicional Indicativo', mood: 'Indicativo', es: 'Condicional', en: 'Conditional', ex: 'I would do', personal: true, imperative: false, inApp: true },
  { key: 'Presente perfecto Indicativo', mood: 'Indicativo', es: 'Perfecto', en: 'Present perfect', ex: 'I have done', personal: true, imperative: false, inApp: true },
  { key: 'Pluscuamperfecto Indicativo', mood: 'Indicativo', es: 'Pluscuamperfecto', en: 'Pluperfect', ex: 'I had done', personal: true, imperative: false, inApp: true },
  { key: 'Futuro perfecto Indicativo', mood: 'Indicativo', es: 'Futuro perfecto', en: 'Future perfect', ex: 'I will have done', personal: true, imperative: false, inApp: true },
  { key: 'Condicional perfecto Indicativo', mood: 'Indicativo', es: 'Condicional perfecto', en: 'Conditional perfect', ex: 'I would have done', personal: true, imperative: false, inApp: true },
  { key: 'Pretérito anterior Indicativo', mood: 'Indicativo', es: 'Pretérito anterior', en: 'Past anterior', ex: 'I had done', personal: true, imperative: false, inApp: false },
  { key: 'Presente Subjuntivo', mood: 'Subjuntivo', es: 'Presente de subjuntivo', en: 'Present subjunctive', ex: 'that I do', personal: true, imperative: false, inApp: true },
  { key: 'Imperfecto Subjuntivo', mood: 'Subjuntivo', es: 'Imperfecto de subjuntivo', en: 'Imperfect subjunctive', ex: 'if I did', personal: true, imperative: false, inApp: true },
  { key: 'Presente perfecto Subjuntivo', mood: 'Subjuntivo', es: 'Perfecto de subjuntivo', en: 'Perfect subjunctive', ex: 'that I have done', personal: true, imperative: false, inApp: true },
  { key: 'Pluscuamperfecto Subjuntivo', mood: 'Subjuntivo', es: 'Pluscuamperfecto de subjuntivo', en: 'Pluperfect subjunctive', ex: 'if I had done', personal: true, imperative: false, inApp: true },
  { key: 'Futuro Subjuntivo', mood: 'Subjuntivo', es: 'Futuro de subjuntivo', en: 'Future subjunctive', ex: 'whoever does', personal: true, imperative: false, inApp: false },
  { key: 'Futuro perfecto Subjuntivo', mood: 'Subjuntivo', es: 'Futuro perfecto de subjuntivo', en: 'Future perfect subjunctive', ex: 'whoever has done', personal: true, imperative: false, inApp: false },
  { key: 'Presente Imperativo Afirmativo', mood: 'Imperativo', es: 'Imperativo afirmativo', en: 'Affirmative imperative', ex: 'do!', personal: true, imperative: true, inApp: true },
  { key: 'Presente Imperativo Negativo', mood: 'Imperativo', es: 'Imperativo negativo', en: 'Negative imperative', ex: "don't do!", personal: true, imperative: true, inApp: true },
  { key: 'Gerundio', mood: 'Formas no personales', es: 'Gerundio', en: 'Gerund', ex: 'doing', personal: false, imperative: false, inApp: true },
  { key: 'Participio', mood: 'Formas no personales', es: 'Participio', en: 'Participle', ex: 'done', personal: false, imperative: false, inApp: true },
];

export const APP_TENSES = TENSES.filter((t) => t.inApp);

/** @type {Record<string, Tense>} */
export const TENSE_BY_KEY = Object.fromEntries(TENSES.map((t) => [t.key, t]));

export const MOODS = /** @type {Mood[]} */ (['Indicativo', 'Subjuntivo', 'Imperativo', 'Formas no personales']);

/** @type {Record<Mood, string>} */
export const MOOD_EN = {
  Indicativo: 'Indicative',
  Subjuntivo: 'Subjunctive',
  Imperativo: 'Imperative',
  'Formas no personales': 'Non-finite forms',
};

/** @type {Person[]} */
export const PERSONS = ['1s', '2s', '3s', '1p', '2p', '3p'];

/** @type {Record<Person, string>} */
export const PERSON_SUFFIX = {
  '1s': '1a persona; singular',
  '2s': '2a persona; singular',
  '3s': '3a persona; singular',
  '1p': '1a persona; plural',
  '2p': '2a persona; plural',
  '3p': '3a persona; plural',
};

/** Short labels for tables. */
/** @type {Record<Person, string>} */
export const PERSON_LABEL = {
  '1s': 'yo',
  '2s': 'tú',
  '3s': 'él/ella/Ud.',
  '1p': 'nosotros',
  '2p': 'vosotros',
  '3p': 'ellos/ellas/Uds.',
};

/** Pronouns a quiz prompt can show, per person. Imperatives use their own set. */
/** @type {Record<Person, string[]>} */
export const PROMPT_PRONOUNS = {
  '1s': ['yo'],
  '2s': ['tú'],
  '3s': ['él', 'ella', 'usted'],
  '1p': ['nosotros', 'nosotras'],
  '2p': ['vosotros', 'vosotras'],
  '3p': ['ellos', 'ellas', 'ustedes'],
};

/** @type {Record<Person, string[]>} */
export const IMPERATIVE_PRONOUNS = {
  '1s': [],
  '2s': ['tú'],
  '3s': ['usted'],
  '1p': ['nosotros'],
  '2p': ['vosotros'],
  '3p': ['ustedes'],
};

/**
 * @param {string} tenseKey
 * @param {Person} person
 */
export function formKey(tenseKey, person) {
  const t = TENSE_BY_KEY[tenseKey];
  if (!t) throw new Error(`Unknown tense: ${tenseKey}`);
  if (!t.personal) return tenseKey;
  return `${tenseKey}; ${PERSON_SUFFIX[person]}`;
}

/**
 * Persons that exist for a tense. Imperatives have no first person singular.
 * @param {string} tenseKey
 * @returns {Person[]}
 */
export function personsFor(tenseKey) {
  const t = TENSE_BY_KEY[tenseKey];
  if (!t) throw new Error(`Unknown tense: ${tenseKey}`);
  if (!t.personal) return [];
  return t.imperative ? PERSONS.filter((p) => p !== '1s') : PERSONS.slice();
}

/**
 * All form keys for a tense.
 * @param {string} tenseKey
 */
export function formKeysFor(tenseKey) {
  const t = TENSE_BY_KEY[tenseKey];
  if (!t.personal) return [tenseKey];
  return personsFor(tenseKey).map((p) => formKey(tenseKey, p));
}

/**
 * @param {string} key
 * @returns {{ tense: string, person: Person | null }}
 */
export function parseFormKey(key) {
  const [tense, n, number] = key.split('; ');
  if (!n) return { tense, person: null };
  const p = /** @type {Person} */ (`${n[0]}${number === 'singular' ? 's' : 'p'}`);
  return { tense, person: p };
}
