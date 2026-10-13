import { test } from 'node:test';
import assert from 'node:assert/strict';
import { practiceQuestions } from '../src/views/practice.js';
import { engine } from './helpers.js';

const app = { engine, store: { settings: { vosotros: true, promptType: 'conjugate' } } };
const choice = (verbs) => ({ verbs, tenses: new Set(['Presente Indicativo']), persons: new Set(['1s', '2s']), promptType: null, count: 20 });

test('a saved list with an unknown verb still starts a quiz with the known verbs', () => {
  assert.equal(engine.has('zzzar'), false);
  const questions = practiceQuestions(app, choice(['hablar', 'zzzar', 'comer']));
  assert.equal(questions.length, 20);
  assert.deepEqual(new Set(questions.map((q) => q.id.split('|')[0])), new Set(['hablar', 'comer']));
});

test('a list of only unknown verbs gives no questions', () => {
  assert.deepEqual(practiceQuestions(app, choice(['zzzar'])), []);
  assert.deepEqual(practiceQuestions(app, choice([])), []);
});
