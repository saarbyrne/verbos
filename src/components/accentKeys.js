// @ts-check
/** Buttons that type accented letters into an input. */
import { h } from '../lib/h.js';

const LETTERS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü'];

/** @param {HTMLInputElement} input */
export function AccentKeys(input) {
  return h('div', { class: 'accent-keys', role: 'group', 'aria-label': 'Accented letters' },
    LETTERS.map((ch) =>
      h('button', {
        type: 'button',
        class: 'key',
        tabindex: '-1',
        onmousedown: (/** @type {Event} */ e) => e.preventDefault(),
        onclick: () => {
          if (input.readOnly || input.disabled) return;
          const start = input.selectionStart ?? input.value.length;
          const end = input.selectionEnd ?? input.value.length;
          input.value = input.value.slice(0, start) + ch + input.value.slice(end);
          input.setSelectionRange(start + 1, start + 1);
          input.focus();
          input.dispatchEvent(new Event('input'));
        },
      }, ch),
    ),
  );
}
