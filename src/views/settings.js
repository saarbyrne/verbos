// @ts-check
import { h } from '../lib/h.js';

/** @typedef {import('../app.js').App} App */

/**
 * @template {string | number} T
 * @param {T[]} options
 * @param {T} current
 * @param {(v: T) => void} onPick
 * @param {(v: T) => string} [label]
 */
function Segmented(options, current, onPick, label = (v) => String(v)) {
  return h('div', { class: 'segmented' }, options.map((o) =>
    h('button', { type: 'button', class: o === current ? 'on' : '', 'aria-pressed': String(o === current), onclick: () => onPick(o) }, label(o))));
}

/** @param {App} app */
export function Settings(app) {
  const s = app.store.settings;
  const rerender = () => (location.hash = `#/settings?r=${Date.now()}`);
  const cap = (/** @type {string} */ v) => v[0].toUpperCase() + v.slice(1);
  return h('section', null,
    h('div', { class: 'page-head' }, h('h1', null, 'Settings')),
    h('div', { class: 'card settings' },
      h('div', { class: 'setting' },
        h('div', { class: 'setting-label' }, 'Vosotros'),
        Segmented(['on', 'off'], s.vosotros ? 'on' : 'off', (v) => { app.store.updateSettings({ vosotros: v === 'on' }); rerender(); }, cap)),
      h('div', { class: 'setting' },
        h('div', { class: 'setting-label' }, 'Accents'),
        Segmented(/** @type {('strict'|'lenient')[]} */ (['strict', 'lenient']), s.accentMode, (v) => { app.store.updateSettings({ accentMode: v }); rerender(); }, cap)),
      h('div', { class: 'setting' },
        h('div', { class: 'setting-label' }, 'Review size'),
        Segmented([10, 20, 30, 50], s.reviewSize, (v) => { app.store.updateSettings({ reviewSize: v }); rerender(); })),
      h('div', { class: 'setting' },
        h('div', { class: 'setting-label' }, 'Prompt'),
        Segmented(/** @type {('conjugate'|'translate'|'mixed')[]} */ (['conjugate', 'translate', 'mixed']), s.promptType, (v) => { app.store.updateSettings({ promptType: v }); rerender(); }, cap))),
  );
}
