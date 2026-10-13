import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, seVariant, normalize, countsAsRight, stripDiacritics } from '../src/engine/check.js';
import { PERSONS, PROMPT_PRONOUNS, formKey } from '../src/engine/tenses.js';
import { engine } from './helpers.js';

const f = (spanish, formKey) => ({ spanish, formKey });
const PI1 = 'Presente Indicativo; 1a persona; singular';
const PRET3 = 'Pretérito Indicativo; 3a persona; singular';

test('exact and normalised answers', () => {
  assert.equal(check('hablo', f('hablo', PI1)), 'correct');
  assert.equal(check('  Hablo. ', f('hablo', PI1)), 'correct');
  assert.equal(check('Tuvimos.', f('tuvimos', 'Pretérito Indicativo; 1a persona; plural')), 'correct');
});

test('subject pronoun is optional', () => {
  assert.equal(check('yo hablo', f('hablo', PI1)), 'correct');
  assert.equal(check('Él habló', f('habló', PRET3)), 'correct');
  assert.equal(check('el habló', f('habló', PRET3)), 'correct');
  assert.equal(check('ustedes hablaron', f('hablaron', 'Pretérito Indicativo; 3a persona; plural')), 'correct');
});

test('the subject pronoun must match the person asked', () => {
  const tense = 'Presente Indicativo';
  const regular = { '1s': 'hablo', '2s': 'hablas', '3s': 'habla', '1p': 'hablamos', '2p': 'habláis', '3p': 'hablan' };
  for (const person of PERSONS) {
    const form = f(regular[person], formKey(tense, person));
    for (const [other, pronouns] of Object.entries(PROMPT_PRONOUNS)) {
      for (const pronoun of pronouns) {
        const expected = other === person ? 'correct' : 'wrong';
        assert.equal(check(`${pronoun} ${regular[person]}`, form), expected, `${pronoun} for ${person}`);
        assert.equal(check(`  ${pronoun.toUpperCase()}   ${regular[person]}. `, form), expected, `${pronoun} in capitals for ${person}`);
      }
    }
    assert.equal(check(regular[person], form), 'correct', `no pronoun for ${person}`);
  }
});

test('subject pronouns also work as short forms and without the accent', () => {
  const k = (person) => formKey('Presente Indicativo', person);
  assert.equal(check('tu hablas', f('hablas', k('2s'))), 'correct');
  assert.equal(check('el habla', f('habla', k('3s'))), 'correct');
  assert.equal(check('ud habla', f('habla', k('3s'))), 'correct');
  assert.equal(check('uds hablan', f('hablan', k('3p'))), 'correct');
  assert.equal(check('ud hablas', f('hablas', k('2s'))), 'wrong');
  assert.equal(check('tu hablo', f('hablo', k('1s'))), 'wrong');
});

test('a wrong pronoun is wrong with other tenses, reflexives and non-personal forms', () => {
  assert.equal(check('tú hablo', f('hablo', PI1)), 'wrong');
  assert.equal(check('tú me levanto', f('me levanto', PI1)), 'wrong');
  assert.equal(check('yo me levanto', f('me levanto', PI1)), 'correct');
  assert.equal(check('ella habló', f('habló', PRET3)), 'correct');
  assert.equal(check('nosotros habló', f('habló', PRET3)), 'wrong');
  assert.equal(check('yo hablando', f('hablando', 'Gerundio')), 'wrong');
  assert.equal(check('hablando', f('hablando', 'Gerundio')), 'correct');
  const imperative = 'Presente Imperativo Negativo; 2a persona; singular';
  assert.equal(check('tú no hables', f('no hables', imperative)), 'correct');
  assert.equal(check('tú hables', f('no hables', imperative)), 'correct');
  assert.equal(check('usted no hables', f('no hables', imperative)), 'wrong');
  assert.equal(check('vosotros no hables', f('no hables', imperative)), 'wrong');
});

test('reflexive pronoun is required', () => {
  assert.equal(check('levanto', f('me levanto', PI1)), 'wrong');
  assert.equal(check('yo me levanto', f('me levanto', PI1)), 'correct');
});

test('accent mistakes', () => {
  assert.equal(check('hablo', f('habló', PRET3)), 'accent');
  assert.equal(check('ano', f('año', PI1)), 'accent');
  assert.equal(countsAsRight('accent', 'strict'), false);
  assert.equal(countsAsRight('accent', 'lenient'), true);
});

test('wrong answers', () => {
  assert.equal(check('hablas', f('hablo', PI1)), 'wrong');
  assert.equal(check('', f('hablo', PI1)), 'wrong');
  assert.equal(check('yo', f('hablo', PI1)), 'wrong');
});

test('negative imperative: no is optional', () => {
  const k = 'Presente Imperativo Negativo; 2a persona; singular';
  assert.equal(check('no hables', f('no hables', k)), 'correct');
  assert.equal(check('hables', f('no hables', k)), 'correct');
  assert.equal(check('¡No hables!', f('no hables', k)), 'correct');
});

test('imperfect subjunctive -se forms', () => {
  assert.equal(seVariant('hablara'), 'hablase');
  assert.equal(seVariant('habláramos'), 'hablásemos');
  assert.equal(seVariant('hablarais'), 'hablaseis');
  assert.equal(seVariant('hablaran'), 'hablasen');
  assert.equal(seVariant('me levantara'), 'me levantase');
  assert.equal(seVariant('hubiera hablado'), 'hubiese hablado');
  const k = 'Imperfecto Subjuntivo; 1a persona; plural';
  assert.equal(check('tuviésemos', f('tuviéramos', k)), 'correct');
  assert.equal(check('tuviesemos', f('tuviéramos', k)), 'accent');
  assert.equal(check('hubiese hablado', f('hubiera hablado', 'Pluscuamperfecto Subjuntivo; 3a persona; singular')), 'correct');
  // -se is not accepted outside the subjunctive tenses
  assert.equal(check('hablase', f('hablara', PI1)), 'wrong');
});

test('alternates from data', () => {
  const k = 'Presente Indicativo; 3a persona; singular';
  const form = engine.conjugate('haber', k);
  assert.equal(form.spanish, 'ha');
  assert.equal(check('hay', form, engine.alternatesFor('haber', k)), 'correct');
  const k2 = 'Futuro Indicativo; 1a persona; singular';
  assert.equal(check('predeciré', engine.conjugate('predecir', k2), engine.alternatesFor('predecir', k2)), 'correct');
});

test('normalize', () => {
  assert.equal(normalize('¡No  HABLES!'), 'no hables');
});

/**
 * Since 2010 the RAE writes words with one vowel group (a diphthong or
 * triphthong) as one syllable, without an accent: guio, crie, frio, hui.
 * True for a word in the data that still has the older accented spelling.
 * @param {string} word
 */
function accentedOneSyllable(word) {
  const runs = word.replace(/([gq])u(?=[eiéí])/g, '$1').match(/[aeiouáéíóúü]+/g) ?? [];
  if (runs.length !== 1 || runs[0].length < 2 || !/[áéíóú]/.test(runs[0])) return false;
  // Two strong vowels, or an accented i or u next to a strong vowel, make two syllables (creó, oí).
  return !/[aeoáéó]{2}/.test(runs[0]) && !(/[íú]/.test(runs[0]) && /[aeoáéó]/.test(runs[0]));
}

test('one-syllable forms accept the 2010 spelling without the accent', async () => {
  const { APP_TENSES, formKeysFor } = await import('../src/engine/tenses.js');
  assert.equal(accentedOneSyllable('guió'), true);
  assert.equal(accentedOneSyllable('huí'), true);
  for (const w of ['creó', 'oí', 'reí', 'dé', 'fui', 'guiais', 'averigüé']) assert.equal(accentedOneSyllable(w), false, w);
  const missing = [];
  for (const inf of engine.infinitives) {
    for (const k of APP_TENSES.flatMap((t) => formKeysFor(t.key))) {
      const form = engine.conjugate(inf, k);
      const words = form.spanish.split(' ');
      if (!words.some(accentedOneSyllable)) continue;
      const modern = words.map((w) => (accentedOneSyllable(w) ? stripDiacritics(w) : w)).join(' ');
      if (check(modern, form, engine.alternatesFor(inf, k)) !== 'correct') missing.push(`${inf}|${k}: ${modern}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('criarse accepts the older accented spellings, like criar', () => {
  const k = (t) => `${t}; 2a persona; plural`;
  for (const [t, answer] of [['Presente Indicativo', 'os criáis'], ['Presente Subjuntivo', 'os criéis'], ['Presente Imperativo Negativo', 'no os criéis']]) {
    assert.equal(check(answer, engine.conjugate('criarse', k(t)), engine.alternatesFor('criarse', k(t))), 'correct', answer);
  }
});

test('every alternates.json entry names a real form and adds a new spelling', async () => {
  const { alternates, template } = await import('./helpers.js');
  for (const [id, list] of Object.entries(alternates)) {
    const i = id.indexOf('|');
    const inf = id.slice(0, i);
    const key = id.slice(i + 1);
    assert.ok(engine.has(inf), `${id}: unknown verb`);
    assert.ok(key in template, `${id}: unknown form`);
    const main = normalize(engine.conjugate(inf, key).spanish);
    for (const a of list) assert.notEqual(normalize(a), main, `${id}: ${a} is the main form`);
  }
});

test('ir and irse accept vamos and vámonos as the nosotros command', () => {
  // The RAE notes that vamos is more common than vayamos as a command.
  const k = 'Presente Imperativo Afirmativo; 1a persona; plural';
  assert.equal(check('vamos', engine.conjugate('ir', k), engine.alternatesFor('ir', k)), 'correct');
  assert.equal(check('vayamos', engine.conjugate('ir', k), engine.alternatesFor('ir', k)), 'correct');
  assert.equal(check('¡Vámonos!', engine.conjugate('irse', k), engine.alternatesFor('irse', k)), 'correct');
  // Not in the negative: "no vamos" is a statement, not a command.
  const n = 'Presente Imperativo Negativo; 1a persona; plural';
  assert.equal(check('no vamos', engine.conjugate('ir', n), engine.alternatesFor('ir', n)), 'wrong');
});
