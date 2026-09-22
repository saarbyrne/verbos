// @ts-check
/** Letter diff between the regular pattern and the real form. */

/**
 * Mark the letters of `actual` that are not part of the longest common
 * subsequence with `regular`.
 * @param {string} actual
 * @param {string} regular
 * @returns {{ text: string, changed: boolean }[]} segments
 */
export function diffSegments(actual, regular) {
  if (actual === regular) return [{ text: actual, changed: false }];
  const a = [...actual];
  const b = [...regular];
  const n = a.length;
  const m = b.length;
  /** @type {number[][]} */
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  /** @type {boolean[]} */
  const changed = new Array(n).fill(true);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      changed[i] = false;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  // A form that only drops letters (ten vs tene) has nothing to mark, so mark it all.
  if (!changed.some(Boolean)) changed.fill(true);
  /** @type {{ text: string, changed: boolean }[]} */
  const out = [];
  a.forEach((ch, k) => {
    const last = out[out.length - 1];
    if (last && last.changed === changed[k]) last.text += ch;
    else out.push({ text: ch, changed: changed[k] });
  });
  return out;
}

/**
 * For regular forms: split into stem and ending so lessons can show endings.
 * Returns null when the form does not start with the stem (compound tenses).
 * @param {string} form
 * @param {string} stem
 */
export function endingSegments(form, stem) {
  const words = form.split(' ');
  const last = words[words.length - 1];
  if (!stem || !last.startsWith(stem) || last === stem) return null;
  const prefix = words.slice(0, -1).join(' ');
  return [
    { text: (prefix ? `${prefix} ` : '') + stem, changed: false },
    { text: last.slice(stem.length), changed: true },
  ];
}
