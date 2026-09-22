// @ts-check
/**
 * @typedef {object} Level
 * @property {number} id
 * @property {string} title
 * @property {string[]} tenses
 * @property {'regular'|'irregular'|'mixed'} pattern
 * @property {string[]} verbs
 * @property {string} lesson
 */

/**
 * @typedef {object} App
 * @property {import('./engine/conjugate.js').Engine} engine
 * @property {{ passMark: number, questionsPerQuiz: number, levels: Level[] }} curriculum
 * @property {string[]} top          top 200 verbs by frequency
 * @property {import('./store/store.js').Store} store
 */
export {};
