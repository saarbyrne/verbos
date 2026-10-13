// @ts-check
/**
 * What the app does when it comes back to the foreground: draw the screen again
 * if the review day changed, so the due counts are right. A quiz is never touched.
 * @param {object} deps
 * @param {() => string} deps.today    the review day, YYYY-MM-DD
 * @param {() => boolean} deps.inQuiz  a quiz or review is open
 * @param {() => void} deps.refresh    draw the current screen again
 */
export function watchReopen({ today, inQuiz, refresh }) {
  let day = today();
  return {
    /** The app is visible again. */
    reopened() {
      if (inQuiz()) return;
      const now = today();
      if (now === day) return;
      day = now;
      refresh();
    },
  };
}
