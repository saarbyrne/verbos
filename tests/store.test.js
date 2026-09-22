import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryStorage, KEYS } from '../src/store/store.js';

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
