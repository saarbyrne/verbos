import { test } from 'node:test';
import assert from 'node:assert/strict';
import { watchReopen } from '../src/lib/reopen.js';
import { today } from '../src/engine/schedule.js';

/** A clock the test moves, and the screen counters the handler works on. */
function setup(start, { quiz = false } = {}) {
  const state = { now: start, quiz, refreshed: 0 };
  const reopen = watchReopen({
    today: () => today(state.now),
    inQuiz: () => state.quiz,
    refresh: () => { state.refreshed++; },
  });
  return { state, reopen };
}

test('reopening on the same review day leaves the screen alone', () => {
  const { state, reopen } = setup(new Date(2026, 8, 5, 22, 0));
  state.now = new Date(2026, 8, 6, 3, 59);
  reopen.reopened();
  assert.equal(state.refreshed, 0);
});

test('reopening after the review day changed draws the screen again, once', () => {
  const { state, reopen } = setup(new Date(2026, 8, 5, 22, 0));
  state.now = new Date(2026, 8, 6, 4, 0);
  reopen.reopened();
  assert.equal(state.refreshed, 1);
  reopen.reopened();
  assert.equal(state.refreshed, 1);
  state.now = new Date(2026, 8, 7, 9, 0);
  reopen.reopened();
  assert.equal(state.refreshed, 2);
});

test('an app opened after midnight but before 4 am does not change day at midnight', () => {
  const { state, reopen } = setup(new Date(2026, 8, 6, 0, 30));
  state.now = new Date(2026, 8, 6, 2, 0);
  reopen.reopened();
  assert.equal(state.refreshed, 0);
  state.now = new Date(2026, 8, 6, 4, 0);
  reopen.reopened();
  assert.equal(state.refreshed, 1);
});

test('a quiz in progress is not interrupted, and the screen is drawn when the app is reopened later', () => {
  const { state, reopen } = setup(new Date(2026, 8, 5, 22, 0), { quiz: true });
  state.now = new Date(2026, 8, 6, 8, 0);
  reopen.reopened();
  assert.equal(state.refreshed, 0);
  state.quiz = false;
  reopen.reopened();
  assert.equal(state.refreshed, 1);
});
