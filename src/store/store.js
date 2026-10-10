// @ts-check
/** Progress, settings and saved lists in localStorage. */
import { applyAnswer } from '../engine/schedule.js';

/** @typedef {import('../engine/schedule.js').ItemState} ItemState */
/** @typedef {{ best: number, completed: boolean, attempts: number }} LevelState */
/** @typedef {{ schemaVersion: number, items: Record<string, ItemState>, levels: Record<string, LevelState> }} Progress */
/** @typedef {{ schemaVersion: number, vosotros: boolean, accentMode: 'strict'|'lenient', reviewSize: number, promptType: 'conjugate'|'translate'|'mixed' }} Settings */
/** @typedef {{ schemaVersion: number, lists: { name: string, verbs: string[] }[] }} Lists */

export const SCHEMA_VERSION = 1;
export const KEYS = { progress: 'verbos:progress', settings: 'verbos:settings', lists: 'verbos:lists' };

/**
 * Upper limits for stored and imported data. They are far above real use
 * (633 verbs × 90 forms is under 57,000 items), so they only stop a broken or
 * hostile file from filling memory or the screen.
 */
export const LIMITS = { items: 100_000, lists: 1_000, verbsPerList: 1_000 };

/** @returns {Progress} */
const defaultProgress = () => ({ schemaVersion: SCHEMA_VERSION, items: {}, levels: {} });
/** @returns {Settings} */
const defaultSettings = () => ({ schemaVersion: SCHEMA_VERSION, vosotros: true, accentMode: 'strict', reviewSize: 30, promptType: 'conjugate' });
/** @returns {Lists} */
const defaultLists = () => ({ schemaVersion: SCHEMA_VERSION, lists: [] });

/**
 * A plain object: not null and not an array.
 * @param {unknown} v
 * @returns {v is Record<string, any>}
 */
const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** @param {unknown} v @returns {v is number} */
const isCount = (v) => Number.isInteger(v) && /** @type {number} */ (v) >= 0;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LEVEL_ID = /^[1-9]\d{0,2}$/;
const RESULTS = ['correct', 'accent', 'wrong'];
const PROMPT_TYPES = ['conjugate', 'translate', 'mixed'];

/**
 * One review item. An item that can't be scheduled (no matching id, box or
 * due date) is null. Counts and the last result are repaired with safe
 * values, and `exact` is false when anything was repaired.
 * @param {string} key  must equal the item's id, `${infinitive}|${formKey}`
 * @param {any} s
 * @returns {{ item: ItemState, exact: boolean } | null}
 */
function cleanItem(key, s) {
  if (!isRecord(s) || s.id !== key || !key.includes('|')) return null;
  if (!Number.isInteger(s.box) || s.box < 1 || s.box > 5) return null;
  if (typeof s.due !== 'string' || !DATE.test(s.due)) return null;
  const seen = isCount(s.seen) && s.seen >= 1 ? s.seen : 1;
  const correct = isCount(s.correct) ? Math.min(s.correct, seen) : 0;
  const lastResult = RESULTS.includes(s.lastResult) ? s.lastResult : 'wrong';
  return {
    item: { id: key, box: s.box, due: s.due, seen, correct, lastResult },
    exact: seen === s.seen && correct === s.correct && lastResult === s.lastResult,
  };
}

/**
 * One level result, repaired with safe values. `exact` is false when anything
 * was repaired.
 * @param {any} s
 * @returns {{ level: LevelState, exact: boolean } | null}
 */
function cleanLevel(s) {
  if (!isRecord(s)) return null;
  const best = typeof s.best === 'number' && s.best >= 0 && s.best <= 1 ? s.best : 0;
  const completed = typeof s.completed === 'boolean' ? s.completed : false;
  const attempts = isCount(s.attempts) ? s.attempts : 0;
  return {
    level: { best, completed, attempts },
    exact: best === s.best && completed === s.completed && attempts === s.attempts,
  };
}

/**
 * Progress without the items and levels that can't be used. `dropped` counts
 * what was left out and `repaired` what was changed.
 * @param {Record<string, any>} s
 * @returns {{ value: Progress, dropped: number, repaired: number }}
 */
function cleanProgress(s) {
  const value = defaultProgress();
  let kept = 0;
  let dropped = 0;
  let repaired = 0;
  const items = isRecord(s.items) ? s.items : {};
  for (const key of Object.keys(items)) {
    const clean = kept < LIMITS.items ? cleanItem(key, items[key]) : null;
    if (!clean) {
      dropped++;
      continue;
    }
    // Keys always contain "|", so "__proto__" never reaches this assignment.
    value.items[key] = clean.item;
    kept++;
    if (!clean.exact) repaired++;
  }
  const levels = isRecord(s.levels) ? s.levels : {};
  for (const key of Object.keys(levels)) {
    const clean = LEVEL_ID.test(key) ? cleanLevel(levels[key]) : null;
    if (!clean) {
      dropped++;
      continue;
    }
    value.levels[key] = clean.level;
    if (!clean.exact) repaired++;
  }
  return { value, dropped, repaired };
}

/**
 * Settings with any missing or wrong field set back to its default.
 * @param {Record<string, any>} s
 * @returns {Settings}
 */
function cleanSettings(s) {
  const d = defaultSettings();
  return {
    schemaVersion: SCHEMA_VERSION,
    vosotros: typeof s.vosotros === 'boolean' ? s.vosotros : d.vosotros,
    accentMode: s.accentMode === 'strict' || s.accentMode === 'lenient' ? s.accentMode : d.accentMode,
    reviewSize: Number.isInteger(s.reviewSize) && s.reviewSize >= 1 && s.reviewSize <= 100 ? s.reviewSize : d.reviewSize,
    promptType: PROMPT_TYPES.includes(s.promptType) ? s.promptType : d.promptType,
  };
}

/**
 * Saved lists, leaving out lists without a name or a verb array, and verbs
 * that are not strings.
 * @param {Record<string, any>} s
 * @returns {Lists}
 */
function cleanLists(s) {
  const value = defaultLists();
  const lists = Array.isArray(s.lists) ? s.lists : [];
  for (const l of lists) {
    if (value.lists.length >= LIMITS.lists) break;
    if (!isRecord(l) || typeof l.name !== 'string' || !l.name.trim() || !Array.isArray(l.verbs)) continue;
    /** @type {string[]} */
    const verbs = [];
    for (const v of l.verbs) {
      if (verbs.length >= LIMITS.verbsPerList) break;
      if (typeof v === 'string') verbs.push(v);
    }
    value.lists.push({ name: l.name, verbs });
  }
  return value;
}

/** @typedef {{ schemaVersion: number }} Versioned */

/**
 * Bring stored data up to the current schema. Version 1 is the first, so this
 * only checks each field. Items without a usable id, box or due date are left
 * out, and wrong counts get safe values. Broken lists are left out, and a wrong
 * setting goes back to its default. The app then always opens.
 * @template {Versioned} T
 * @param {any} stored
 * @param {(s: Record<string, any>) => T} clean
 * @param {() => T} defaults
 * @returns {T}
 */
export function migrate(stored, clean, defaults) {
  return isRecord(stored) ? clean(stored) : defaults();
}

/** Whether data was written by a newer version of verbos. @param {unknown} stored */
const isNewer = (stored) => isRecord(stored) && typeof stored.schemaVersion === 'number' && stored.schemaVersion > SCHEMA_VERSION;

/** @typedef {{ getItem(k: string): string | null, setItem(k: string, v: string): void, removeItem(k: string): void }} StorageLike */

/** @returns {StorageLike} */
export function memoryStorage() {
  /** @type {Map<string, string>} */
  const m = new Map();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

/** localStorage when it works, memory otherwise. @returns {StorageLike} */
export function safeStorage() {
  try {
    const s = globalThis.localStorage;
    const probe = '__verbos_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return memoryStorage();
  }
}

/** @param {StorageLike} [storage] */
export function createStore(storage = safeStorage()) {
  /**
   * Keys that hold data from a newer version of verbos. This version can't
   * read that data, so it starts from the defaults and never overwrites it.
   * @type {Set<string>}
   */
  const locked = new Set();

  /** @param {string} key */
  const read = (key) => {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  /** @param {string} key @param {unknown} value */
  const write = (key, value) => {
    if (locked.has(key)) return;
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  };
  /**
   * @template {Versioned} T
   * @param {string} key
   * @param {(s: Record<string, any>) => T} clean
   * @param {() => T} defaults
   * @returns {T}
   */
  const load = (key, clean, defaults) => {
    const stored = read(key);
    if (isNewer(stored)) {
      locked.add(key);
      return defaults();
    }
    return migrate(stored, clean, defaults);
  };

  let progress = load(KEYS.progress, (s) => cleanProgress(s).value, defaultProgress);
  let settings = load(KEYS.settings, cleanSettings, defaultSettings);
  let lists = load(KEYS.lists, cleanLists, defaultLists);

  /** @type {Set<() => void>} */
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn());

  return {
    get progress() { return progress; },
    get settings() { return settings; },
    get lists() { return lists; },

    /** @param {() => void} fn */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /**
     * @param {string} id
     * @param {'correct'|'accent'|'wrong'} result
     * @param {boolean} right
     * @param {string} date
     */
    recordAnswer(id, result, right, date) {
      progress.items[id] = applyAnswer(progress.items[id], id, result, right, date);
      write(KEYS.progress, progress);
    },

    /**
     * @param {number} levelId
     * @param {number} score 0 to 1
     * @param {number} passMark 0 to 1
     */
    recordLevel(levelId, score, passMark) {
      const prev = progress.levels[levelId] ?? { best: 0, completed: false, attempts: 0 };
      progress.levels[levelId] = {
        best: Math.max(prev.best, score),
        completed: prev.completed || score >= passMark,
        attempts: prev.attempts + 1,
      };
      write(KEYS.progress, progress);
      emit();
    },

    /** @param {Partial<Settings>} patch */
    updateSettings(patch) {
      settings = { ...settings, ...patch, schemaVersion: SCHEMA_VERSION };
      write(KEYS.settings, settings);
      emit();
    },

    /** @param {string} name @param {string[]} verbs */
    saveList(name, verbs) {
      const rest = lists.lists.filter((l) => l.name !== name);
      lists = { ...lists, lists: [...rest, { name, verbs: [...verbs] }] };
      write(KEYS.lists, lists);
      emit();
    },

    /** @param {string} name */
    deleteList(name) {
      lists = { ...lists, lists: lists.lists.filter((l) => l.name !== name) };
      write(KEYS.lists, lists);
      emit();
    },

    exportData() {
      return { app: 'verbos', exportedAt: new Date().toISOString(), progress, settings, lists };
    },

    /**
     * Replace everything with an export file. A file with any broken progress
     * record is refused, so it can't replace good progress. Wrong settings go
     * back to their defaults, and broken saved lists are left out.
     * @param {any} data
     */
    importData(data) {
      if (!isRecord(data) || data.app !== 'verbos') throw new Error('Not a Verbos export');
      for (const k of /** @type {const} */ (['progress', 'settings', 'lists'])) {
        const v = data[k];
        if (!isRecord(v)) throw new Error(`Missing ${k}`);
        if (typeof v.schemaVersion !== 'number' || v.schemaVersion > SCHEMA_VERSION) throw new Error(`Unsupported ${k} version`);
      }
      if (!isRecord(data.progress.items) || !isRecord(data.progress.levels)) throw new Error('Bad progress');
      const clean = cleanProgress(data.progress);
      if (clean.dropped || clean.repaired) throw new Error('Bad progress');
      progress = clean.value;
      settings = cleanSettings(data.settings);
      lists = cleanLists(data.lists);
      // The person chose to replace their data, including any from a newer version.
      locked.clear();
      write(KEYS.progress, progress);
      write(KEYS.settings, settings);
      write(KEYS.lists, lists);
      emit();
    },
  };
}

/** @typedef {ReturnType<typeof createStore>} Store */
