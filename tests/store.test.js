import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryStorage, KEYS, LIMITS } from '../src/store/store.js';

test('defaults and persistence', () => {
  const s = memoryStorage();
  const a = createStore(s);
  assert.equal(a.settings.vosotros, true);
  assert.equal(a.settings.accentMode, 'strict');
  a.updateSettings({ vosotros: false });
  a.recordAnswer('tener|Participio', 'correct', true, '2026-09-22');
  a.recordLevel(1, 0.85, 0.8);
  a.saveList('mine', ['ser', 'estar']);
  const b = createStore(s);
  assert.equal(b.settings.vosotros, false);
  assert.equal(b.progress.items['tener|Participio'].box, 2);
  assert.deepEqual(b.progress.levels[1], { best: 0.85, completed: true, attempts: 1 });
  assert.deepEqual(b.lists.lists, [{ name: 'mine', verbs: ['ser', 'estar'] }]);
});

test('level best score and completion never go down', () => {
  const a = createStore(memoryStorage());
  a.recordLevel(2, 0.9, 0.8);
  a.recordLevel(2, 0.5, 0.8);
  assert.deepEqual(a.progress.levels[2], { best: 0.9, completed: true, attempts: 2 });
});

test('export and import round trip', () => {
  const a = createStore(memoryStorage());
  a.recordAnswer('ser|Participio', 'wrong', false, '2026-09-22');
  a.updateSettings({ reviewSize: 10 });
  const data = JSON.parse(JSON.stringify(a.exportData()));
  const b = createStore(memoryStorage());
  b.importData(data);
  assert.equal(b.progress.items['ser|Participio'].box, 1);
  assert.equal(b.settings.reviewSize, 10);
  assert.throws(() => b.importData({ app: 'other' }));
  assert.throws(() => b.importData({ ...data, progress: { ...data.progress, schemaVersion: 99 } }));
});

test('corrupt storage falls back to defaults', () => {
  const s = memoryStorage();
  s.setItem(KEYS.progress, '{not json');
  const a = createStore(s);
  assert.deepEqual(a.progress.items, {});
});

// A valid export to break in different ways.
const exportWith = (change) => {
  const a = createStore(memoryStorage());
  a.recordAnswer('hablar|Presente Indicativo; 1a persona; singular', 'correct', true, '2026-09-22');
  a.recordLevel(1, 0.9, 0.8);
  a.saveList('mine', ['ser', 'estar']);
  const data = JSON.parse(JSON.stringify(a.exportData()));
  change(data);
  return data;
};
const ITEM = 'hablar|Presente Indicativo; 1a persona; singular';

test('an import with broken progress is refused and changes nothing', () => {
  const broken = [
    (d) => { d.progress.items = null; },
    (d) => { d.progress.levels = null; },
    (d) => { d.progress.items = []; },
    (d) => { d.progress.items.x = null; },
    (d) => { d.progress.items[ITEM].due = 20261001; },
    (d) => { d.progress.items[ITEM].due = '1 Oct'; },
    (d) => { d.progress.items[ITEM].box = '3'; },
    (d) => { d.progress.items[ITEM].box = 9; },
    (d) => { d.progress.items[ITEM].seen = 0; },
    (d) => { d.progress.items[ITEM].correct = 5; },
    (d) => { d.progress.items[ITEM].lastResult = 'maybe'; },
    (d) => { d.progress.items['comer|Participio'] = d.progress.items[ITEM]; },
    (d) => { d.progress.levels['1'].best = 'high'; },
    (d) => { d.progress.levels.abc = { best: 1, completed: true, attempts: 1 }; },
    (d) => { d.progress = JSON.parse('{"schemaVersion":1,"levels":{},"items":{"__proto__":{"id":"__proto__"}}}'); },
  ];
  for (const change of broken) {
    const s = memoryStorage();
    const b = createStore(s);
    b.recordAnswer('ser|Participio', 'wrong', false, '2026-09-22');
    const before = s.getItem(KEYS.progress);
    assert.throws(() => b.importData(exportWith(change)), /Bad progress/, String(change));
    assert.equal(s.getItem(KEYS.progress), before);
    assert.deepEqual(Object.keys(b.progress.items), ['ser|Participio']);
  }
});

test('an import with wrong settings or broken lists uses defaults for those parts', () => {
  const b = createStore(memoryStorage());
  b.importData(exportWith((d) => {
    d.settings = { schemaVersion: 1, vosotros: 'false', accentMode: 'loose', reviewSize: 'abc', promptType: 'mixed' };
    d.lists.lists = [{ name: 'ok', verbs: ['ser', 7, null, 'ir'] }, { name: '', verbs: [] }, { name: 'x', verbs: null }, null, 'list'];
  }));
  assert.deepEqual(b.settings, { schemaVersion: 1, vosotros: true, accentMode: 'strict', reviewSize: 30, promptType: 'mixed' });
  assert.deepEqual(b.lists.lists, [{ name: 'ok', verbs: ['ser', 'ir'] }]);
  assert.equal(b.progress.items[ITEM].box, 2);
  const c = createStore(memoryStorage());
  c.importData(exportWith((d) => { d.lists.lists = null; }));
  assert.deepEqual(c.lists.lists, []);
});

test('broken data already in storage is cleaned when the app opens', () => {
  const s = memoryStorage();
  const good = { id: ITEM, box: 3, due: '2026-10-01', seen: 4, correct: 3, lastResult: 'correct' };
  s.setItem(KEYS.progress, JSON.stringify({ schemaVersion: 1, items: { [ITEM]: good, x: null, 'ser|Participio': { id: 'ser|Participio', box: 'x' } }, levels: null }));
  s.setItem(KEYS.settings, JSON.stringify({ schemaVersion: 1, vosotros: false, reviewSize: -4 }));
  s.setItem(KEYS.lists, JSON.stringify({ schemaVersion: 1, lists: null }));
  const a = createStore(s);
  assert.deepEqual(a.progress.items, { [ITEM]: good });
  assert.deepEqual(a.progress.levels, {});
  // Wrong counts are repaired, so real progress is never thrown away for them.
  const COMER = 'comer|Participio';
  s.setItem(KEYS.progress, JSON.stringify({ schemaVersion: 1, items: { [COMER]: { id: COMER, box: 4, due: '2026-10-20', correct: 9 } }, levels: { 3: { best: 0.9, completed: true } } }));
  const r = createStore(s);
  assert.deepEqual(r.progress.items[COMER], { id: COMER, box: 4, due: '2026-10-20', seen: 1, correct: 1, lastResult: 'wrong' });
  assert.deepEqual(r.progress.levels[3], { best: 0.9, completed: true, attempts: 0 });
  assert.equal(a.settings.vosotros, false);
  assert.equal(a.settings.reviewSize, 30);
  assert.deepEqual(a.lists.lists, []);
  for (const raw of ['null', '[]', '"text"', '42']) {
    s.setItem(KEYS.progress, raw);
    assert.deepEqual(createStore(s).progress.items, {}, raw);
  }
});

test('__proto__ keys in a file never change object prototypes', () => {
  const json = '{"app":"verbos","progress":{"schemaVersion":1,"items":{},"levels":{},"__proto__":{"polluted":1}},'
    + '"settings":{"schemaVersion":1,"__proto__":{"polluted":1}},"lists":{"schemaVersion":1,"lists":[{"name":"a","verbs":[],"__proto__":{"polluted":1}}]}}';
  const b = createStore(memoryStorage());
  b.importData(JSON.parse(json));
  assert.equal(/** @type {any} */ ({}).polluted, undefined);
  assert.equal(Object.getPrototypeOf(b.progress.items), Object.prototype);
  assert.equal(/** @type {any} */ (b.settings).polluted, undefined);
  assert.deepEqual(b.lists.lists, [{ name: 'a', verbs: [] }]);
  const s = memoryStorage();
  s.setItem(KEYS.progress, '{"schemaVersion":1,"items":{"__proto__":{"id":"__proto__","box":1}},"levels":{"__proto__":{}}}');
  const a = createStore(s);
  assert.equal(Object.getPrototypeOf(a.progress.items), Object.prototype);
  assert.deepEqual(Object.keys(a.progress.items), []);
});

test('huge files are capped or refused', () => {
  const b = createStore(memoryStorage());
  b.importData(exportWith((d) => {
    d.lists.lists = Array.from({ length: LIMITS.lists + 50 }, (_, i) => ({ name: `l${i}`, verbs: ['ser'] }));
    d.lists.lists[0].verbs = Array.from({ length: LIMITS.verbsPerList + 50 }, () => 'ser');
  }));
  assert.equal(b.lists.lists.length, LIMITS.lists);
  assert.equal(b.lists.lists[0].verbs.length, LIMITS.verbsPerList);
  const item = { id: '', box: 1, due: '2026-10-01', seen: 1, correct: 0, lastResult: 'wrong' };
  const items = {};
  for (let i = 0; i <= LIMITS.items; i++) items[`v${i}|Participio`] = { ...item, id: `v${i}|Participio` };
  assert.throws(() => b.importData(exportWith((d) => { d.progress.items = items; })), /Bad progress/);
});

test('data from a newer version of verbos is never overwritten', () => {
  const s = memoryStorage();
  const newer = JSON.stringify({ schemaVersion: 2, items: [['hablar', 1]] });
  s.setItem(KEYS.progress, newer);
  const a = createStore(s);
  assert.deepEqual(a.progress.items, {});
  a.recordAnswer(ITEM, 'correct', true, '2026-10-01');
  a.recordLevel(1, 1, 0.8);
  assert.equal(s.getItem(KEYS.progress), newer);
  // An import is an explicit choice to replace everything.
  a.importData(exportWith(() => {}));
  assert.equal(JSON.parse(/** @type {string} */ (s.getItem(KEYS.progress))).schemaVersion, 1);
});
