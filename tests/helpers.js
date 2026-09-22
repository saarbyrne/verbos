// @ts-check
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createEngine } from '../src/engine/conjugate.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** @param {string} p */
export const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

export const verbs = readJson('data/vendor/spanish-verbs/verbs.json');
export const template = readJson('data/vendor/spanish-verbs/template.json');
export const additions = readJson('data/additions.json');
export const alternates = readJson('data/alternates.json');

export const vendorEngine = createEngine({ verbs, template });
export const engine = createEngine({ verbs, template, additions, alternates });
