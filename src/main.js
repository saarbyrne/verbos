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
import { AppsButton } from './lib/apps.js';

/** @typedef {import('./app.js').App} App */

const SLIDERS = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 5h8M15 5h2M3 10h2M9 10h8M3 15h10"/><circle cx="13" cy="5" r="2"/><circle cx="7" cy="10" r="2"/><circle cx="15" cy="15" r="2"/></svg>';

const NAV = [
  { href: '#/', label: 'Levels', match: ['', 'level'] },
  { href: '#/review', label: 'Review', match: ['review'] },
  { href: '#/practice', label: 'Practice', match: ['practice'] },
  { href: '#/verbs', label: 'Verbs', match: ['verbs'] },
  { href: '#/progress', label: 'Progress', match: ['progress'] },
];

const CHEVRON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';

/**
 * Where the back link goes on screens below the main level. Null on main screens.
 * @param {string[]} parts
 * @returns {{ href: string, label: string } | null}
 */
export function backFor(parts) {
  const [a, b, c] = parts;
  if (a === 'level' && b) return c === 'quiz' ? { href: `#/level/${b}`, label: `Level ${b}` } : { href: '#/', label: 'Levels' };
  if ((a === 'review' || a === 'practice') && b === 'quiz') return { href: `#/${a}`, label: a === 'review' ? 'Review' : 'Practice' };
  if (a === 'verbs' && b) return { href: '#/verbs', label: 'Verbs' };
  return null;
}

const settingsLink = h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Settings', title: 'Settings', innerHTML: SLIDERS });

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
  const back = backFor(parts);
  if (back) {
    replace(nav, h('a', { class: 'back', href: back.href }, h('span', { class: 'icon', innerHTML: CHEVRON }), back.label));
  } else {
    replace(nav, NAV.map((n) =>
      h('a', { href: n.href, class: n.match.includes(parts[0]) ? 'active' : '', 'aria-current': n.match.includes(parts[0]) ? 'page' : null },
        n.label,
        n.label === 'Review' && due ? h('span', { class: 'badge' }, String(due)) : null)));
  }
  settingsLink.toggleAttribute('aria-current', parts[0] === 'settings');
  replace(main, route(app, parts));
  window.scrollTo(0, 0);
}

async function start() {
  const nav = /** @type {HTMLElement} */ (document.getElementById('nav'));
  const main = /** @type {HTMLElement} */ (document.getElementById('main'));
  document.getElementById('top-actions')?.append(settingsLink, AppsButton('verbos', { label: 'hecho apps', support: 'Support', privacy: 'Privacy' }));
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
  // Ask the browser not to clear saved progress when space runs low.
  navigator.storage?.persist?.().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

start();
