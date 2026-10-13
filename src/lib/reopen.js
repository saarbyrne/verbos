// @ts-check
/**
 * What the app does when it comes back to the foreground: load a new version of
 * itself, or draw the screen again if the review day changed so the due counts
 * are right. A quiz or review is never touched.
 * @param {object} deps
 * @param {() => string} deps.today    the review day, YYYY-MM-DD
 * @param {() => boolean} deps.inQuiz  a quiz or review is open
 * @param {() => void} deps.refresh    draw the current screen again
 * @param {() => void} deps.reload     load the page again
 */
export function watchReopen({ today, inQuiz, refresh, reload }) {
  let day = today();
  let updated = false;
  return {
    /** A new version of the app has taken over from the one that is running. */
    markUpdated() {
      updated = true;
    },
    /** The app is visible again. */
    reopened() {
      if (inQuiz()) return;
      if (updated) {
        reload();
        return;
      }
      const now = today();
      if (now === day) return;
      day = now;
      refresh();
    },
  };
}

/**
 * Notices when a new service worker takes over a page that already had one,
 * which is a new version of the app, and loads it if the app is in view.
 * @param {EventTarget & { controller: unknown }} container  navigator.serviceWorker
 * @param {ReturnType<typeof watchReopen>} reopen
 * @param {() => boolean} isVisible
 */
export function watchNewVersion(container, reopen, isVisible) {
  const hadWorker = Boolean(container.controller);
  container.addEventListener('controllerchange', () => {
    if (!hadWorker) return;
    reopen.markUpdated();
    if (isVisible()) reopen.reopened();
  });
}
