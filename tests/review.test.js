import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewItems } from '../src/views/review.js';
import { pickReview } from '../src/engine/schedule.js';
import { makeQuestion, splitId } from '../src/engine/quiz.js';
import { engine } from './helpers.js';

const item = (id) => ({ id, box: 1, due: '2026-10-01', seen: 1, correct: 0, lastResult: 'wrong' });
const app = (ids, vosotros = true) => ({
  engine,
  store: { settings: { vosotros }, progress: { items: Object.fromEntries(ids.map((id) => [id, item(id)])) } },
});

test('review leaves out items for unknown verbs and forms, so it can still start', () => {
  const good = ['hablar|Presente Indicativo; 1a persona; singular', 'hacer|Participio'];
  const bad = [
    'hablar|Presente Indicativo; 9a persona; singular',
    'hablar|Presente Indicativo',
    'hablar|Futuro Subjuntivo; 1a persona; singular',
    'toString|Presente Indicativo; 1a persona; singular',
    'constructor|Participio',
    '__proto__|Participio',
    'nohay|Participio',
  ];
  const items = reviewItems(/** @type {any} */ (app([...good, ...bad])));
  assert.deepEqual(items.map((s) => s.id), good);
  const ids = pickReview(items, { date: '2026-10-09', size: 30 });
  assert.equal(ids.map((id) => makeQuestion(engine, splitId(id), 'conjugate')).length, 2);
});

test('review leaves out vosotros forms when vosotros is off', () => {
  const ids = ['hablar|Presente Indicativo; 2a persona; plural', 'hablar|Presente Indicativo; 3a persona; plural'];
  assert.equal(reviewItems(/** @type {any} */ (app(ids, true))).length, 2);
  assert.deepEqual(reviewItems(/** @type {any} */ (app(ids, false))).map((s) => s.id), [ids[1]]);
});

test('only real verbs count as known', () => {
  for (const name of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) {
    assert.equal(engine.has(name), false, name);
    assert.throws(() => engine.conjugate(name, 'Participio'), /Unknown verb/);
  }
  assert.equal(engine.has('hablar'), true);
});
