// @ts-check
import { h } from '../lib/h.js';
import { buildPool, sample, makeQuestion } from '../engine/quiz.js';
import { Lesson } from '../components/lesson.js';
import { TenseName } from '../components/tenseName.js';
import { QuizRunner } from '../components/quizRunner.js';

/** @typedef {import('../app.js').App} App */

/** @param {App} app @param {number} id */
function find(app, id) {
  return app.curriculum.levels.find((l) => l.id === id);
}

/** @param {App} app @param {number} id */
export function Level(app, id) {
  const level = find(app, id);
  if (!level) return h('p', null, 'Level not found');
  const s = app.store.progress.levels[level.id];
  const prev = find(app, id - 1);
  const next = find(app, id + 1);
  return h('section', null,
    h('div', { class: 'page-head' },
      h('div', null,
        h('div', { class: 'eyebrow' }, `Level ${level.id}`),
        h('h1', null, level.title)),
      s ? h('div', { class: 'head-meta' }, `${Math.round(s.best * 100)}%`) : null),
    h('div', { class: 'chips' }, level.tenses.map((t) => h('span', { class: 'chip' }, TenseName(t)))),
    Lesson(app, level.lesson),
    h('div', { class: 'quiz-verbs' },
      h('h2', null, 'Quiz verbs'),
      h('div', { class: 'chips' }, level.verbs.map((v) => h('a', { class: 'chip link', href: `#/verbs/${encodeURIComponent(v)}`, lang: 'es' }, v)))),
    h('div', { class: 'actions sticky' },
      h('a', { class: 'btn primary', href: `#/level/${level.id}/quiz?r=${Date.now()}` }, 'Start quiz')),
    h('nav', { class: 'pager' },
      prev ? h('a', { href: `#/level/${prev.id}` }, `← ${prev.title}`) : h('span'),
      next ? h('a', { href: `#/level/${next.id}` }, `${next.title} →`) : h('span')),
  );
}

/** @param {App} app @param {number} id */
export function LevelQuiz(app, id) {
  const level = find(app, id);
  if (!level) return h('p', null, 'Level not found');
  const { settings } = app.store;
  const pool = buildPool({ verbs: level.verbs, tenses: level.tenses, vosotros: settings.vosotros });
  const n = Math.min(app.curriculum.questionsPerQuiz, pool.length);
  const questions = sample(pool, n).map((item) => makeQuestion(app.engine, item, settings.promptType));
  const next = find(app, id + 1);
  return QuizRunner(app, {
    title: level.title,
    questions,
    backHref: `#/level/${level.id}`,
    onComplete: (r) => app.store.recordLevel(level.id, r.score, app.curriculum.passMark),
    statusFor: (r) => (r.score >= app.curriculum.passMark ? 'Level complete' : 'Not yet'),
    endActions: (r) => [
      { label: 'Retry', href: `#/level/${level.id}/quiz?r=${Date.now()}`, primary: r.score < app.curriculum.passMark || !next },
      { label: 'Lesson', href: `#/level/${level.id}` },
      ...(next ? [{ label: `Level ${next.id}`, href: `#/level/${next.id}`, primary: r.score >= app.curriculum.passMark }] : []),
    ],
  });
}
