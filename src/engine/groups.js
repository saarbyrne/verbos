// @ts-check
/** The 21 levels grouped on hecho's one level scale: Fácil, Medio, Difícil. */

export const GROUPS = [
  { label: 'Fácil', from: 1, to: 5 },
  { label: 'Medio', from: 6, to: 14 },
  { label: 'Difícil', from: 15, to: 21 },
];

/** @param {number} id */
export const groupFor = (id) => GROUPS.find((g) => id >= g.from && id <= g.to) ?? GROUPS[GROUPS.length - 1];
