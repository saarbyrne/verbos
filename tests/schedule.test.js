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
  assert.equal(today(new Date(2026, 8, 5, 12)), '2026-09-05');
});

test('the review day starts at 4 am', () => {
  assert.equal(today(new Date(2026, 8, 5, 4, 0, 0)), '2026-09-05');
  assert.equal(today(new Date(2026, 8, 5, 3, 59, 59, 999)), '2026-09-04');
  assert.equal(today(new Date(2026, 8, 5, 0, 0, 0)), '2026-09-04');
  assert.equal(today(new Date(2026, 8, 5, 23, 59, 59, 999)), '2026-09-05');
  assert.equal(today(new Date(2026, 0, 1, 2, 30)), '2025-12-31');
  assert.equal(today(new Date(2028, 2, 1, 1)), '2028-02-29');
});

test('an answer at 23:50 is not due again before 4 am', () => {
  const answered = applyAnswer(undefined, 'x', 'wrong', false, today(new Date(2026, 8, 5, 23, 50)));
  assert.equal(answered.due, '2026-09-06');
  assert.equal(dueCount([answered], today(new Date(2026, 8, 6, 0, 0))), 0);
  assert.equal(dueCount([answered], today(new Date(2026, 8, 6, 3, 59))), 0);
  assert.equal(dueCount([answered], today(new Date(2026, 8, 6, 4, 0))), 1);
});

test('addDays does not depend on the time of day', () => {
  assert.equal(addDays('2026-09-05', 0), '2026-09-05');
  assert.equal(addDays('2026-09-05', 1), '2026-09-06');
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

const ZONES = [
  // Madrid and Dublin change at night. The next four change at midnight itself.
  'Europe/Madrid', 'Europe/Dublin', 'America/Santiago', 'America/Havana', 'Atlantic/Azores', 'Asia/Beirut',
  'America/New_York', 'America/Los_Angeles', 'Asia/Kolkata', 'Asia/Kathmandu', 'Australia/Lord_Howe', 'Pacific/Auckland', 'Pacific/Kiritimati',
];

/**
 * Runs a module script in a child process set to the given time zone.
 * @param {string} TZ
 * @param {string} code
 */
async function inZone(TZ, code) {
  const { execFileSync } = await import('node:child_process');
  const url = new URL('../src/engine/schedule.js', import.meta.url).href;
  const script = `const { addDays, today } = await import(${JSON.stringify(url)});\n${code}`;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ }, encoding: 'utf8', timeout: 30_000 }));
}

test('dates stay right across daylight-saving changes, in any time zone', async () => {
  // Walks two years day by day and compares with UTC date maths.
  const code = `
    const day = (i) => new Date(Date.UTC(2026, 0, 1) + i * 864e5).toISOString().slice(0, 10);
    const bad = [];
    for (let i = 0; i < 730; i++) {
      for (const n of [1, 3, 7, 14, 30]) if (addDays(day(i), n) !== day(i + n)) bad.push(day(i) + '+' + n);
    }
    console.log(JSON.stringify(bad));`;
  for (const TZ of ZONES) assert.deepEqual(await inZone(TZ, code), [], TZ);
});

test('the review day changes at 4 am local time, in any time zone and on any day', async () => {
  // For every calendar day: the last millisecond before 4 am still belongs to the day before.
  const code = `
    const day = (i) => new Date(Date.UTC(2026, 0, 1) + i * 864e5).toISOString().slice(0, 10);
    const bad = [];
    for (let i = 1; i < 730; i++) {
      const [y, m, d] = day(i).split('-').map(Number);
      const at = (...t) => today(new Date(y, m - 1, d, ...t));
      if (at(0, 0, 0, 0) !== day(i - 1)) bad.push(day(i) + ' 00:00');
      if (at(1, 30) !== day(i - 1)) bad.push(day(i) + ' 01:30');
      if (at(3, 59, 59, 999) !== day(i - 1)) bad.push(day(i) + ' 03:59');
      if (at(4, 0, 0, 0) !== day(i)) bad.push(day(i) + ' 04:00');
      if (at(23, 59, 59, 999) !== day(i)) bad.push(day(i) + ' 23:59');
    }
    console.log(JSON.stringify(bad));`;
  for (const TZ of ZONES) assert.deepEqual(await inZone(TZ, code), [], TZ);
});
