// @ts-check
import { h } from '../lib/h.js';
import { pickReview, dueCount, today } from '../engine/schedule.js';
import { makeQuestion, splitId } from '../engine/quiz.js';
import { APP_TENSES, formKeysFor, parseFormKey } from '../engine/tenses.js';
import { QuizRunner } from '../components/quizRunner.js';

/** @typedef {import('../app.js').App} App */

/** Every form key the app can ask about. */
const APP_FORM_KEYS = new Set(APP_TENSES.flatMap((t) => formKeysFor(t.key)));

/**
 * Review items allowed by the current settings. Items for an unknown verb or
 * form are left out, so they can't stop a review from starting.
 * @param {App} app
 */
export function reviewItems(app) {
  const { vosotros } = app.store.settings;
  return Object.values(app.store.progress.items).filter((s) => {
    const { infinitive, formKey } = splitId(s.id);
    if (!app.engine.has(infinitive) || !APP_FORM_KEYS.has(formKey)) return false;
    return vosotros || parseFormKey(formKey).person !== '2p';
  });
}

/** @param {App} app */
export function Review(app) {
  const items = reviewItems(app);
  const due = dueCount(items, today());
  return h('section', null,
    h('div', { class: 'page-head' }, h('h1', null, 'Review')),
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, String(due)), h('div', { class: 'stat-label' }, 'Due today')),
      h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, String(items.length)), h('div', { class: 'stat-label' }, 'Items learned')),
      h('div', { class: 'stat' }, h('div', { class: 'stat-num' }, String(app.store.settings.reviewSize)), h('div', { class: 'stat-label' }, 'Session size'))),
    h('div', { class: 'actions' },
      items.length
        ? h('a', { class: 'btn primary', href: `#/review/quiz?r=${Date.now()}` }, 'Start review')
        : h('span', { class: 'btn disabled', 'aria-disabled': 'true' }, 'Start review')),
  );
}

/** @param {App} app */
export function ReviewQuiz(app) {
  const { settings } = app.store;
  const ids = pickReview(reviewItems(app), { date: today(), size: settings.reviewSize });
  const questions = ids.map((id) => makeQuestion(app.engine, splitId(id), settings.promptType));
  if (!questions.length) return Review(app);
  return QuizRunner(app, {
    title: 'Review',
    questions,
    backHref: '#/review',
    endActions: () => [
      { label: 'Done', href: '#/', primary: true },
      { label: 'Again', href: `#/review/quiz?r=${Date.now()}` },
    ],
  });
}
