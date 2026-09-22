import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPool, sample, makeQuestion, pronounFor, splitId, itemId } from '../src/engine/quiz.js';
import { engine } from './helpers.js';

test('pool respects vosotros and persons', () => {
  const all = buildPool({ verbs: ['hablar'], tenses: ['Presente Indicativo'], vosotros: true });
  assert.equal(all.length, 6);
  const noVos = buildPool({ verbs: ['hablar'], tenses: ['Presente Indicativo'], vosotros: false });
  assert.equal(noVos.length, 5);
  const imp = buildPool({ verbs: ['hablar'], tenses: ['Presente Imperativo Afirmativo'], vosotros: true });
  assert.equal(imp.length, 5);
  const only = buildPool({ verbs: ['hablar', 'comer'], tenses: ['Presente Indicativo'], persons: ['1s'], vosotros: true });
  assert.equal(only.length, 2);
  const pp = buildPool({ verbs: ['hacer'], tenses: ['Participio'], persons: ['1s'], vosotros: true });
  assert.equal(pp.length, 1);
});

test('sample repeats when the pool is small', () => {
  assert.equal(sample([1, 2, 3], 7).length, 7);
  assert.equal(new Set(sample([1, 2, 3, 4, 5], 5)).size, 5);
  assert.deepEqual(sample([], 5), []);
});

test('pronouns', () => {
  assert.equal(pronounFor('Presente Indicativo; 1a persona; singular'), 'yo');
  assert.equal(pronounFor('Presente Imperativo Afirmativo; 3a persona; singular'), 'usted');
  assert.equal(pronounFor('Participio'), null);
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(pronounFor('Presente Indicativo; 3a persona; singular'));
  assert.deepEqual(seen, new Set(['él', 'ella', 'usted']));
});

test('question for participle is always conjugate', () => {
  const q = makeQuestion(engine, { infinitive: 'hacer', formKey: 'Participio' }, 'translate');
  assert.equal(q.type, 'conjugate');
  assert.equal(q.form.spanish, 'hecho');
});

test('ids round trip', () => {
  const id = itemId('tener', 'Pretérito Indicativo; 1a persona; plural');
  assert.deepEqual(splitId(id), { infinitive: 'tener', formKey: 'Pretérito Indicativo; 1a persona; plural' });
});

test('translate prompts accept verbs with the same English', () => {
  assert.deepEqual(engine.synonyms('arreglar'), ['disponer']);
  assert.deepEqual(engine.synonyms('ser'), []);
  const key = 'Pretérito Indicativo; 1a persona; singular';
  const q = makeQuestion(engine, { infinitive: 'arreglar', formKey: key }, 'translate');
  assert.equal(q.type, 'translate');
  assert.ok(q.alternates.includes('dispuse'));
  const c = makeQuestion(engine, { infinitive: 'arreglar', formKey: key }, 'conjugate');
  assert.deepEqual(c.alternates, []);
});
