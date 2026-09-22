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

/** @returns {Progress} */
const defaultProgress = () => ({ schemaVersion: SCHEMA_VERSION, items: {}, levels: {} });
/** @returns {Settings} */
const defaultSettings = () => ({ schemaVersion: SCHEMA_VERSION, vosotros: true, accentMode: 'strict', reviewSize: 30, promptType: 'conjugate' });
/** @returns {Lists} */
const defaultLists = () => ({ schemaVersion: SCHEMA_VERSION, lists: [] });

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

/**
 * Bring stored data up to the current schema. Version 1 is the first, so this
 * only fills in missing fields.
 * @template T
 * @param {any} stored
 * @param {() => T} defaults
 * @returns {T}
 */
export function migrate(stored, defaults) {
  const base = defaults();
  if (!stored || typeof stored !== 'object') return base;
  return { ...base, ...stored, schemaVersion: SCHEMA_VERSION };
}

/** @param {StorageLike} [storage] */
export function createStore(storage = safeStorage()) {
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
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  };

  let progress = migrate(read(KEYS.progress), defaultProgress);
  let settings = migrate(read(KEYS.settings), defaultSettings);
  let lists = migrate(read(KEYS.lists), defaultLists);

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

    /** @param {any} data */
    importData(data) {
      if (!data || data.app !== 'verbos') throw new Error('Not a Verbos export');
      for (const k of /** @type {const} */ (['progress', 'settings', 'lists'])) {
        const v = data[k];
        if (!v || typeof v !== 'object') throw new Error(`Missing ${k}`);
        if (typeof v.schemaVersion !== 'number' || v.schemaVersion > SCHEMA_VERSION) throw new Error(`Unsupported ${k} version`);
      }
      if (typeof data.progress.items !== 'object' || typeof data.progress.levels !== 'object') throw new Error('Bad progress');
      progress = migrate(data.progress, defaultProgress);
      settings = migrate(data.settings, defaultSettings);
      lists = migrate(data.lists, defaultLists);
      write(KEYS.progress, progress);
      write(KEYS.settings, settings);
      write(KEYS.lists, lists);
      emit();
    },
  };
}

/** @typedef {ReturnType<typeof createStore>} Store */
