import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Verb, verbFromLink } from '../src/views/verbs.js';
import { engine } from './helpers.js';

test('a verb link is read back into the verb', () => {
  assert.equal(verbFromLink('hablar'), 'hablar');
  assert.equal(verbFromLink(encodeURIComponent('oír')), 'oír');
  assert.equal(verbFromLink(encodeURIComponent('levantarse')), 'levantarse');
  assert.equal(engine.has(verbFromLink(encodeURIComponent('oír'))), true);
});

test('a broken verb link is a verb the app does not know', () => {
  for (const link of ['%E0', '%', '%E0%A4%A', 'hablar%']) {
    assert.doesNotThrow(() => verbFromLink(link), link);
    assert.equal(engine.has(verbFromLink(link)), false, link);
  }
});

test('a broken verb link shows Verb not found', () => {
  // The smallest document the DOM helper needs.
  globalThis.document = {
    createElement: (tag) => ({ tag, children: [], setAttribute() {}, addEventListener() {}, appendChild(c) { this.children.push(c); return c; } }),
    createTextNode: (text) => ({ text }),
  };
  const screen = Verb({ engine }, verbFromLink('%E0'));
  assert.equal(screen.tag, 'p');
  assert.deepEqual(screen.children.map((c) => c.text), ['Verb not found']);
  assert.equal(Verb({ engine }, verbFromLink('zzzar')).children[0].text, 'Verb not found');
});
