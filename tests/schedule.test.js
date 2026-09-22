import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAnswer, addDays, today, pickReview, dueCount } from '../src/engine/schedule.js';

test('addDays across month and year ends', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-12-25', 30), '2027-01-24');
});

test('today formats local date', () => {
  assert.equal(today(new Date(2026, 8, 5)), '2026-09-05');
});

test('first answer: right goes to box 2, wrong to box 1', () => {
  const a = applyAnswer(undefined, 'x', 'correct', true, '2026-09-22');
  assert.equal(a.box, 2);
  assert.equal(a.due, '2026-09-25');
  assert.equal(a.seen, 1);
  assert.equal(a.correct, 1);
  const b = applyAnswer(undefined, 'x', 'wrong', false, '2026-09-22');
  assert.equal(b.box, 1);
  assert.equal(b.due, '2026-09-23');
});

test('boxes move up to 5 and fall back to 1', () => {
  let s = applyAnswer(undefined, 'x', 'correct', true, '2026-09-22');
  for (let i = 0; i < 6; i++) s = applyAnswer(s, 'x', 'correct', true, '2026-09-22');
  assert.equal(s.box, 5);
  assert.equal(s.due, '2026-10-22');
  s = applyAnswer(s, 'x', 'accent', false, '2026-09-22');
  assert.equal(s.box, 1);
  assert.equal(s.lastResult, 'accent');
  assert.equal(s.seen, 8);
  assert.equal(s.correct, 7);
});

test('pickReview: due first, then lowest accuracy', () => {
  const items = [
    { id: 'a', box: 3, due: '2026-09-30', seen: 4, correct: 4, lastResult: 'correct' },
    { id: 'b', box: 1, due: '2026-09-21', seen: 2, correct: 1, lastResult: 'wrong' },
    { id: 'c', box: 2, due: '2026-09-22', seen: 2, correct: 2, lastResult: 'correct' },
    { id: 'd', box: 2, due: '2026-09-29', seen: 4, correct: 1, lastResult: 'wrong' },
  ];
  assert.deepEqual(pickReview(items, { date: '2026-09-22', size: 3 }), ['b', 'c', 'd']);
  assert.deepEqual(pickReview(items, { date: '2026-09-22', size: 1 }), ['b']);
  assert.equal(dueCount(items, '2026-09-22'), 2);
  assert.deepEqual(pickReview(items, { date: '2026-09-22', size: 5, include: (s) => s.id !== 'b' }), ['c', 'd', 'a']);
});
