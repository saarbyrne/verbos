// @ts-check
/** Leitner review schedule. Dates are local calendar dates, YYYY-MM-DD. */

/** @typedef {1|2|3|4|5} Box */

/**
 * @typedef {object} ItemState
 * @property {string} id         `${infinitive}|${formKey}`
 * @property {Box} box
 * @property {string} due        YYYY-MM-DD
 * @property {number} seen
 * @property {number} correct
 * @property {'correct'|'accent'|'wrong'} lastResult
 */

/** @type {Record<Box, number>} */
export const INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

/** @param {number} n */
const pad = (n) => String(n).padStart(2, '0');

/** @param {Date} [d] */
export function today(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * @param {string} date YYYY-MM-DD
 * @param {number} days
 */
export function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  return today(new Date(y, m - 1, d + days));
}

/**
 * Apply one first-attempt answer to an item.
 * @param {ItemState | undefined} state
 * @param {string} id
 * @param {'correct'|'accent'|'wrong'} result
 * @param {boolean} right   whether the result counts as right (depends on accent mode)
 * @param {string} date     today, YYYY-MM-DD
 * @returns {ItemState}
 */
export function applyAnswer(state, id, result, right, date) {
  /** @type {Box} */
  let box;
  if (!state) box = right ? 2 : 1;
  else box = right ? /** @type {Box} */ (Math.min(5, state.box + 1)) : 1;
  return {
    id,
    box,
    due: addDays(date, INTERVALS[box]),
    seen: (state?.seen ?? 0) + 1,
    correct: (state?.correct ?? 0) + (right ? 1 : 0),
    lastResult: result,
  };
}

/** @param {ItemState} s */
export const accuracy = (s) => (s.seen ? s.correct / s.seen : 0);

/**
 * Pick items for a review session: due items first (oldest first), then the
 * items with the lowest accuracy.
 * @param {ItemState[]} items
 * @param {{ date: string, size: number, include?: (s: ItemState) => boolean }} opts
 * @returns {string[]} ids
 */
export function pickReview(items, { date, size, include = () => true }) {
  const pool = items.filter(include);
  const due = pool.filter((s) => s.due <= date).sort((a, b) => a.due.localeCompare(b.due) || accuracy(a) - accuracy(b));
  const picked = due.slice(0, size).map((s) => s.id);
  if (picked.length < size) {
    const taken = new Set(picked);
    const rest = pool
      .filter((s) => !taken.has(s.id))
      .sort((a, b) => accuracy(a) - accuracy(b) || a.due.localeCompare(b.due));
    for (const s of rest) {
      if (picked.length >= size) break;
      picked.push(s.id);
    }
  }
  return picked;
}

/**
 * @param {ItemState[]} items
 * @param {string} date
 */
export function dueCount(items, date) {
  return items.filter((s) => s.due <= date).length;
}
