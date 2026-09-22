import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vendorEngine, engine, verbs, template, additions } from './helpers.js';
import { stressFinalVowel, splitInfinitive } from '../src/engine/conjugate.js';
import { TENSES, formKeysFor } from '../src/engine/tenses.js';

test('template has 108 form keys and TENSES covers them all', () => {
  const keys = TENSES.flatMap((t) => formKeysFor(t.key));
  assert.equal(Object.keys(template).length, 108);
  assert.deepEqual(new Set(keys), new Set(Object.keys(template)));
});

test('every vendored verb and form key generates a clean form', () => {
  let count = 0;
  for (const inf of Object.keys(verbs)) {
    for (const f of vendorEngine.allForms(inf)) {
      assert.ok(f.spanish.length > 0, `${inf} ${f.formKey} empty`);
      assert.ok(!f.spanish.includes('<'), `${inf} ${f.formKey} placeholder: ${f.spanish}`);
      assert.ok(!f.english.includes('<'), `${inf} ${f.formKey} english placeholder: ${f.english}`);
      assert.ok(!/[¡!]/.test(f.spanish), `${inf} ${f.formKey} punctuation`);
      count++;
    }
  }
  assert.equal(count, 66420);
});

test('additions generate clean forms too', () => {
  for (const inf of Object.keys(additions)) {
    for (const f of engine.allForms(inf)) {
      assert.ok(!f.spanish.includes('<'), `${inf} ${f.formKey}`);
    }
  }
  assert.equal(engine.infinitives.length, Object.keys(verbs).length + Object.keys(additions).length);
});

const P = {
  '1s': '1a persona; singular', '2s': '2a persona; singular', '3s': '3a persona; singular',
  '1p': '1a persona; plural', '2p': '2a persona; plural', '3p': '3a persona; plural',
};
const key = (t, p) => (p ? `${t}; ${P[p]}` : t);

// Checked against the Python code in fjarri/spanish-verbs.
const GOLDEN = [
  ['hablar', 'Presente Indicativo', '1s', 'hablo'],
  ['comer', 'Presente Indicativo', '2p', 'coméis'],
  ['vivir', 'Presente Indicativo', '1p', 'vivimos'],
  ['ser', 'Presente Indicativo', '1s', 'soy'],
  ['ir', 'Presente Indicativo', '1p', 'vamos'],
  ['pensar', 'Presente Indicativo', '1s', 'pienso'],
  ['poder', 'Presente Indicativo', '3s', 'puede'],
  ['pedir', 'Presente Indicativo', '3p', 'piden'],
  ['hacer', 'Presente Indicativo', '1s', 'hago'],
  ['conocer', 'Presente Indicativo', '1s', 'conozco'],
  ['hablar', 'Pretérito Indicativo', '3p', 'hablaron'],
  ['buscar', 'Pretérito Indicativo', '1s', 'busqué'],
  ['tener', 'Pretérito Indicativo', '1p', 'tuvimos'],
  ['dormir', 'Pretérito Indicativo', '3s', 'durmió'],
  ['ser', 'Imperfecto Indicativo', '1p', 'éramos'],
  ['ir', 'Imperfecto Indicativo', '1p', 'íbamos'],
  ['decir', 'Participio', null, 'dicho'],
  ['ver', 'Participio', null, 'visto'],
  ['leer', 'Gerundio', null, 'leyendo'],
  ['levantarse', 'Presente perfecto Indicativo', '1s', 'me he levantado'],
  ['tener', 'Futuro Indicativo', '1s', 'tendré'],
  ['hacer', 'Condicional Indicativo', '3p', 'harían'],
  ['tener', 'Presente Imperativo Afirmativo', '2s', 'ten'],
  ['decir', 'Presente Imperativo Afirmativo', '2s', 'di'],
  ['hablar', 'Presente Imperativo Afirmativo', '2p', 'hablad'],
  ['levantarse', 'Presente Imperativo Afirmativo', '2p', 'levantaos'],
  ['hablar', 'Presente Imperativo Negativo', '2s', 'no hables'],
  ['pensar', 'Presente Subjuntivo', '2p', 'penséis'],
  ['ser', 'Presente Subjuntivo', '1s', 'sea'],
  ['tener', 'Imperfecto Subjuntivo', '1p', 'tuviéramos'],
  ['hablar', 'Pluscuamperfecto Subjuntivo', '3s', 'hubiera hablado'],
  // additions
  ['imponer', 'Presente Imperativo Afirmativo', '2s', 'impón'],
  ['imponer', 'Participio', null, 'impuesto'],
  ['reunir', 'Presente Indicativo', '1s', 'reúno'],
  ['adquirir', 'Presente Indicativo', '3p', 'adquieren'],
  ['referir', 'Pretérito Indicativo', '3s', 'refirió'],
  ['pretender', 'Participio', null, 'pretendido'],
  ['existir', 'Presente Indicativo', '1s', 'existo'],
];

for (const [inf, t, p, expected] of GOLDEN) {
  test(`golden: ${inf} ${t} ${p ?? ''} = ${expected}`, () => {
    assert.equal(engine.conjugate(inf, key(t, p)).spanish, expected);
  });
}

test('irregular flag and regular form', () => {
  const f = engine.conjugate('tener', key('Pretérito Indicativo', '1p'));
  assert.equal(f.irregular, true);
  assert.equal(f.regularSpanish, 'tenimos');
  const g = engine.conjugate('hablar', key('Presente Indicativo', '1s'));
  assert.equal(g.irregular, false);
  const h = engine.conjugate('hacer', key('Presente perfecto Indicativo', '1s'));
  assert.equal(h.spanish, 'he hecho');
  assert.equal(h.irregular, true);
});

test('english', () => {
  assert.equal(engine.conjugate('tener', key('Pretérito Indicativo', '1p')).english, 'We had');
  assert.equal(engine.meaning('tener'), 'to have');
  assert.equal(engine.note('ser'), 'permanent');
});

test('stressFinalVowel and splitInfinitive', () => {
  assert.equal(stressFinalVowel('habl'), 'hábl');
  assert.equal(stressFinalVowel('re'), 'ré');
  assert.deepEqual(splitInfinitive('reír'), { infinitive: 'reír', stem: 're', ending: 'ir', reflexive: false });
  assert.deepEqual(splitInfinitive('levantarse'), { infinitive: 'levantar', stem: 'levant', ending: 'ar', reflexive: true });
});

test('every tense has an English example', () => {
  for (const t of TENSES) assert.ok(t.ex && t.ex.length > 0, t.key);
});
