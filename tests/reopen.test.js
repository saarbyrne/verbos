import { test } from 'node:test';
import assert from 'node:assert/strict';
import { watchReopen, watchNewVersion } from '../src/lib/reopen.js';
import { today } from '../src/engine/schedule.js';

/** A clock the test moves, and the screen counters the handler works on. */
function setup(start, { quiz = false } = {}) {
  const state = { now: start, quiz, refreshed: 0, reloaded: 0 };
  const reopen = watchReopen({
    today: () => today(state.now),
    inQuiz: () => state.quiz,
    refresh: () => { state.refreshed++; },
    reload: () => { state.reloaded++; },
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

test('a new version is loaded when the app is reopened outside a quiz', () => {
  const { state, reopen } = setup(new Date(2026, 8, 5, 12, 0));
  reopen.reopened();
  assert.equal(state.reloaded, 0);
  reopen.markUpdated();
  reopen.reopened();
  assert.equal(state.reloaded, 1);
  assert.equal(state.refreshed, 0);
});

test('a new version waits while a quiz or review is in progress', () => {
  const { state, reopen } = setup(new Date(2026, 8, 5, 12, 0), { quiz: true });
  reopen.markUpdated();
  reopen.reopened();
  assert.equal(state.reloaded, 0);
  state.quiz = false;
  reopen.reopened();
  assert.equal(state.reloaded, 1);
});

/** @param {boolean} controlled */
function fakeWorkerContainer(controlled) {
  const target = Object.assign(new EventTarget(), { controller: controlled ? {} : null });
  return { target, change: () => target.dispatchEvent(new Event('controllerchange')) };
}

test('a worker taking over a page that had one marks a new version and loads it if the app is visible', () => {
  const { state, reopen } = setup(new Date(2026, 8, 5, 12, 0));
  const sw = fakeWorkerContainer(true);
  let visible = true;
  watchNewVersion(sw.target, reopen, () => visible);
  sw.change();
  assert.equal(state.reloaded, 1);
  visible = false;
  sw.change();
  assert.equal(state.reloaded, 1);
  visible = true;
  reopen.reopened();
  assert.equal(state.reloaded, 2);
});

test('a new version found in the background is loaded when the app comes back', () => {
  const { state, reopen } = setup(new Date(2026, 8, 5, 12, 0));
  const sw = fakeWorkerContainer(true);
  watchNewVersion(sw.target, reopen, () => false);
  sw.change();
  assert.equal(state.reloaded, 0);
  reopen.reopened();
  assert.equal(state.reloaded, 1);
});

test('the first worker taking over a page that had none is not a new version', () => {
  const { state, reopen } = setup(new Date(2026, 8, 5, 12, 0));
  const sw = fakeWorkerContainer(false);
  watchNewVersion(sw.target, reopen, () => true);
  sw.change();
  reopen.reopened();
  assert.equal(state.reloaded, 0);
});

test('a new version found during a quiz is not loaded until the quiz is over', () => {
  const { state, reopen } = setup(new Date(2026, 8, 5, 12, 0), { quiz: true });
  const sw = fakeWorkerContainer(true);
  watchNewVersion(sw.target, reopen, () => true);
  sw.change();
  assert.equal(state.reloaded, 0);
});
