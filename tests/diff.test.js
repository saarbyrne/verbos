import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffSegments, endingSegments } from '../src/engine/diff.js';

const marked = (segs) => segs.filter((s) => s.changed).map((s) => s.text).join('+');

test('diff marks changed letters', () => {
  assert.equal(marked(diffSegments('busqué', 'buscé')), 'qu');
  assert.equal(marked(diffSegments('tuvimos', 'tenimos')), 'uv');
  assert.equal(marked(diffSegments('pienso', 'penso')), 'i');
  assert.equal(marked(diffSegments('soy', 'so')), 'y');
});

test('diff with no inserted letters marks the whole form', () => {
  assert.equal(marked(diffSegments('ten', 'tene')), 'ten');
});

test('identical forms have no changes', () => {
  assert.deepEqual(diffSegments('hablo', 'hablo'), [{ text: 'hablo', changed: false }]);
});

test('ending segments', () => {
  assert.deepEqual(endingSegments('hablamos', 'habl'), [
    { text: 'habl', changed: false },
    { text: 'amos', changed: true },
  ]);
  assert.deepEqual(endingSegments('me levanto', 'levant'), [
    { text: 'me levant', changed: false },
    { text: 'o', changed: true },
  ]);
  assert.equal(endingSegments('he hablado', 'habl')?.[1].text, 'ado');
  assert.equal(endingSegments('soy', 's')?.[1].text, 'oy');
});
