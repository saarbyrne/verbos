import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { engine, readJson, ROOT } from './helpers.js';
import { TENSE_BY_KEY, formKeysFor } from '../src/engine/tenses.js';

const curriculum = readJson('data/curriculum.json');

test('21 levels with sequential ids', () => {
  assert.equal(curriculum.levels.length, 21);
  curriculum.levels.forEach((l, i) => assert.equal(l.id, i + 1));
});

for (const level of curriculum.levels) {
  test(`level ${level.id} ${level.title}`, () => {
    assert.ok(level.verbs.length >= 5 && level.verbs.length <= 12, 'verb count');
    for (const t of level.tenses) assert.ok(TENSE_BY_KEY[t]?.inApp, `tense ${t}`);
    for (const v of level.verbs) {
      assert.ok(engine.has(v), `unknown verb ${v}`);
      const irregular = level.tenses.some((t) => formKeysFor(t).some((k) => engine.conjugate(v, k).irregular));
      if (level.pattern === 'regular') assert.equal(irregular, false, `${v} should be regular in ${level.tenses}`);
      if (level.pattern === 'irregular') assert.equal(irregular, true, `${v} should be irregular in ${level.tenses}`);
    }
    assert.ok(existsSync(join(ROOT, 'content/lessons', level.lesson)), `lesson file ${level.lesson}`);
  });
}

test('lesson table directives name known verbs and tenses', () => {
  const re = /\{\{table ([^}]+)\}\}/g;
  for (const level of curriculum.levels) {
    const md = readFileSync(join(ROOT, 'content/lessons', level.lesson), 'utf8');
    for (const m of md.matchAll(re)) {
      const tense = m[1].match(/"([^"]+)"/)?.[1];
      const verbs = m[1].replace(/"[^"]+"/, '').trim().split(/\s+/);
      assert.ok(TENSE_BY_KEY[tense], `${level.lesson}: tense ${tense}`);
      for (const v of verbs) assert.ok(engine.has(v), `${level.lesson}: verb ${v}`);
    }
  }
});

test('top verbs list has 200 known verbs', () => {
  const top = readJson('data/top-verbs.json').verbs;
  assert.equal(top.length, 200);
  assert.equal(new Set(top).size, 200);
  for (const v of top) assert.ok(engine.has(v), v);
});
