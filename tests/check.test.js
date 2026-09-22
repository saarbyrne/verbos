import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, seVariant, normalize, countsAsRight } from '../src/engine/check.js';
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
