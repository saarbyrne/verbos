// @ts-check
import { h, replace } from './lib/h.js';
import { loadAll } from './engine/load.js';
import { createStore } from './store/store.js';
import { dueCount, today } from './engine/schedule.js';
import { Levels } from './views/levels.js';
import { Level, LevelQuiz } from './views/level.js';
import { Review, ReviewQuiz, reviewItems } from './views/review.js';
import { Practice, PracticeQuiz } from './views/practice.js';
import { Verbs, Verb } from './views/verbs.js';
import { Progress } from './views/progress.js';
import { Settings } from './views/settings.js';

/** @typedef {import('./app.js').App} App */

const SLIDERS = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 5h8M15 5h2M3 10h2M9 10h8M3 15h10"/><circle cx="13" cy="5" r="2"/><circle cx="7" cy="10" r="2"/><circle cx="15" cy="15" r="2"/></svg>';

const NAV = [
  { href: '#/', label: 'Levels', match: ['', 'level'] },
  { href: '#/review', label: 'Review', match: ['review'] },
  { href: '#/practice', label: 'Practice', match: ['practice'] },
  { href: '#/verbs', label: 'Verbs', match: ['verbs'] },
  { href: '#/progress', label: 'Progress', match: ['progress'] },
  { href: '#/settings', label: 'Settings', match: ['settings'], icon: true },
];

/** @param {App} app @param {string[]} parts */
function route(app, parts) {
  const [a, b, c] = parts;
  switch (a) {
    case undefined:
    case '':
      return Levels(app);
    case 'level':
      return c === 'quiz' ? LevelQuiz(app, Number(b)) : Level(app, Number(b));
    case 'review':
      return b === 'quiz' ? ReviewQuiz(app) : Review(app);
    case 'practice':
      return b === 'quiz' ? PracticeQuiz(app) : Practice(app);
    case 'verbs':
      return b ? Verb(app, decodeURIComponent(b)) : Verbs(app);
    case 'progress':
      return Progress(app);
    case 'settings':
      return Settings(app);
    default:
      return Levels(app);
  }
}

/** @param {App} app @param {HTMLElement} nav @param {HTMLElement} main */
function render(app, nav, main) {
  const path = location.hash.replace(/^#\/?/, '').split('?')[0];
  const parts = path.split('/');
  const inQuiz = parts.includes('quiz');
  document.body.classList.toggle('quiz-mode', inQuiz);
  const due = dueCount(reviewItems(app), today());
  replace(nav, NAV.map((n) =>
    h('a', { href: n.href, class: n.match.includes(parts[0]) ? 'active' : '', 'aria-current': n.match.includes(parts[0]) ? 'page' : null, 'aria-label': n.icon ? n.label : null, title: n.icon ? n.label : null },
      n.icon ? h('span', { class: 'icon', innerHTML: SLIDERS }) : n.label,
      n.label === 'Review' && due ? h('span', { class: 'badge' }, String(due)) : null)));
  replace(main, route(app, parts));
  window.scrollTo(0, 0);
}

async function start() {
  const nav = /** @type {HTMLElement} */ (document.getElementById('nav'));
  const main = /** @type {HTMLElement} */ (document.getElementById('main'));
  try {
    const [{ engine, curriculum }, top] = await Promise.all([
      loadAll(),
      fetch('data/top-verbs.json').then((r) => r.json()),
    ]);
    /** @type {App} */
    const app = { engine, curriculum, top: top.verbs, store: createStore() };
    window.addEventListener('hashchange', () => render(app, nav, main));
    render(app, nav, main);
  } catch (err) {
    replace(main, h('p', { class: 'error' }, String(/** @type {Error} */ (err).message ?? err)));
  }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

start();
