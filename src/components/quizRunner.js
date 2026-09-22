// @ts-check
/** One quiz runner for level quizzes, review and practice. */
import { h, replace } from '../lib/h.js';
import { check, countsAsRight } from '../engine/check.js';
import { today } from '../engine/schedule.js';
import { TENSE_BY_KEY, parseFormKey } from '../engine/tenses.js';
import { AccentKeys } from './accentKeys.js';
import { FormText } from './verbTable.js';
import { TenseName, tenseText } from './tenseName.js';

/** @typedef {import('../app.js').App} App */
/** @typedef {import('../engine/quiz.js').Question} Question */
/** @typedef {import('../engine/check.js').CheckResult} CheckResult */

/**
 * @typedef {object} QuizResult
 * @property {number} total
 * @property {number} firstCorrect
 * @property {number} score        0 to 1
 * @property {Question[]} misses
 */

/**
 * @typedef {object} QuizOptions
 * @property {string} title
 * @property {Question[]} questions
 * @property {string} backHref
 * @property {(r: QuizResult) => void} [onComplete]
 * @property {(r: QuizResult) => string | null} [statusFor]
 * @property {(r: QuizResult) => { label: string, href: string, primary?: boolean }[]} endActions
 */

/** @param {Question} q */
function promptSummary(q) {
  return [q.form.infinitive, tenseText(parseFormKey(q.form.formKey).tense), q.pronoun].filter(Boolean).join(' · ');
}

/**
 * @param {App} app
 * @param {QuizOptions} opts
 */
export function QuizRunner(app, opts) {
  const root = h('section', { class: 'quiz' });
  const total = opts.questions.length;
  /** @type {{ q: Question, n: number, attempt: number }[]} */
  const queue = opts.questions.map((q, n) => ({ q, n, attempt: 0 }));
  /** @type {Map<number, boolean>} */
  const firstRight = new Map();
  /** @type {Set<string>} */
  const recorded = new Set();
  let pos = 0;
  let done = 0;
  let finished = false;

  function render() {
    if (pos >= queue.length) return renderEnd();
    const cur = queue[pos];
    const { q } = cur;
    const tense = TENSE_BY_KEY[parseFormKey(q.form.formKey).tense];
    const note = app.engine.note(q.form.infinitive);
    let checked = false;

    const input = /** @type {HTMLInputElement} */ (h('input', {
      class: 'answer',
      type: 'text',
      autocomplete: 'off',
      autocorrect: 'off',
      autocapitalize: 'none',
      spellcheck: 'false',
      lang: 'es',
      enterkeyhint: 'go',
      'aria-label': 'Answer',
    }));
    const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
    const button = h('button', { class: 'btn primary', type: 'button' }, 'Check');

    const prompt = q.type === 'conjugate'
      ? h('div', { class: 'prompt' },
          h('div', { class: 'prompt-main', lang: 'es' }, q.form.infinitive),
          h('div', { class: 'prompt-meta' },
            h('span', { class: 'chip' }, TenseName(tense.key)),
            q.pronoun ? h('span', { class: 'pronoun', lang: 'es' }, q.pronoun) : null))
      : h('div', { class: 'prompt' },
          h('div', { class: 'prompt-main en' }, q.form.english),
          h('div', { class: 'prompt-meta' },
            h('span', { class: 'chip' }, TenseName(tense.key)),
            note ? h('span', { class: 'chip muted' }, note) : null));

    function doCheck() {
      if (checked) return;
      if (!input.value.trim()) {
        input.focus();
        return;
      }
      checked = true;
      /** @type {CheckResult} */
      const result = check(input.value, q.form, q.alternates);
      const right = countsAsRight(result, app.store.settings.accentMode);
      if (cur.attempt === 0) {
        firstRight.set(cur.n, right);
        if (!recorded.has(q.id)) {
          app.store.recordAnswer(q.id, result, right, today());
          recorded.add(q.id);
        }
      }
      if (right) done++;
      else queue.push({ q, n: cur.n, attempt: cur.attempt + 1 });

      root.querySelector('.bar > span')?.setAttribute('style', `width:${(done / total) * 100}%`);
      const counter = root.querySelector('.counter');
      if (counter) counter.textContent = `${done} / ${total}`;

      const label = { correct: 'Correct', accent: 'Accent', wrong: 'Wrong' }[result];
      input.classList.add('locked', result);
      replace(feedback,
        h('div', { class: `status ${result}` }, label),
        h('div', { class: 'answer-line', lang: 'es' },
          result !== 'correct' ? h('s', { class: 'typed' }, input.value.trim()) : null,
          FormText(q.form)),
        h('div', { class: 'sub' }, q.type === 'conjugate' ? q.form.english : promptSummary(q)),
      );
      button.textContent = 'Continue';
      input.focus();
    }

    function next() {
      pos++;
      render();
    }

    button.addEventListener('click', () => (checked ? next() : doCheck()));
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (checked) next();
      else doCheck();
    });

    replace(root,
      h('header', { class: 'quiz-head' },
        h('a', { href: opts.backHref, class: 'close', 'aria-label': 'Close' }, '×'),
        h('div', { class: 'quiz-title' }, opts.title),
        h('div', { class: 'counter' }, `${done} / ${total}`)),
      h('div', { class: 'bar' }, h('span', { style: `width:${(done / total) * 100}%` })),
      h('div', { class: 'card quiz-card' },
        prompt,
        input,
        AccentKeys(input),
        feedback,
        h('div', { class: 'actions' }, button)),
    );
    requestAnimationFrame(() => input.focus());
  }

  function renderEnd() {
    const firstCorrect = [...firstRight.values()].filter(Boolean).length;
    const missed = new Set([...firstRight.entries()].filter(([, r]) => !r).map(([n]) => n));
    /** @type {QuizResult} */
    const result = {
      total,
      firstCorrect,
      score: total ? firstCorrect / total : 0,
      misses: opts.questions.filter((_, n) => missed.has(n)),
    };
    if (!finished) {
      finished = true;
      opts.onComplete?.(result);
    }
    const status = opts.statusFor?.(result);
    replace(root,
      h('header', { class: 'quiz-head' },
        h('a', { href: opts.backHref, class: 'close', 'aria-label': 'Close' }, '×'),
        h('div', { class: 'quiz-title' }, opts.title),
        h('div', { class: 'counter' }, `${total} / ${total}`)),
      h('div', { class: 'bar' }, h('span', { style: 'width:100%' })),
      h('div', { class: 'card result' },
        h('div', { class: 'score' }, `${Math.round(result.score * 100)}%`),
        h('div', { class: 'sub' }, `${firstCorrect} / ${total}`),
        status ? h('div', { class: `status ${result.score >= app.curriculum.passMark ? 'correct' : 'wrong'}` }, status) : null,
        result.misses.length
          ? h('ul', { class: 'misses' }, result.misses.map((q) =>
              h('li', null, h('span', { class: 'muted' }, promptSummary(q)), h('span', { lang: 'es' }, FormText(q.form)))))
          : null,
        h('div', { class: 'actions' }, opts.endActions(result).map((a) =>
          h('a', { class: `btn ${a.primary ? 'primary' : ''}`, href: a.href }, a.label))),
      ),
    );
  }

  render();
  return root;
}
