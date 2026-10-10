import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { ROOT } from './helpers.js';
import { precacheList } from '../scripts/precache.mjs';

const ORIGIN = 'https://verbos.hecho.fyi';
const SOURCE = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const CACHE = SOURCE.match(/const CACHE = '([^']+)'/)?.[1];

/** @param {string | { url: string }} r */
const abs = (r) => new URL(typeof r === 'string' ? r : r.url, `${ORIGIN}/sw.js`).href;
/** @param {string} u */
const noSearch = (u) => u.split('?')[0];

/**
 * Runs sw.js with fake caches and a fake network.
 * @param {(req: any) => Promise<Response>} network
 */
function worker(network) {
  /** @type {Record<string, (e: any) => void>} */
  const on = {};
  /** @type {Map<string, Map<string, Response>>} */
  const store = new Map();
  /** @type {any[]} */
  const precached = [];
  /** @param {string} name */
  const open = (name) => {
    const m = store.get(name) ?? new Map();
    store.set(name, m);
    return {
      put: async (/** @type {any} */ req, /** @type {Response} */ res) => void m.set(abs(req), res),
      addAll: async (/** @type {any[]} */ reqs) => reqs.forEach((r) => { precached.push(r); m.set(abs(r), new Response(`cached ${abs(r)}`)); }),
    };
  };
  const caches = {
    open: async (/** @type {string} */ name) => open(name),
    keys: async () => [...store.keys()],
    delete: async (/** @type {string} */ name) => store.delete(name),
    match: async (/** @type {any} */ req, /** @type {{ ignoreSearch?: boolean }} */ opts = {}) => {
      const key = (/** @type {string} */ u) => (opts.ignoreSearch ? noSearch(u) : u);
      for (const m of store.values()) for (const [u, res] of m) if (key(u) === key(abs(req))) return res.clone();
      return undefined;
    },
  };
  // In a worker, relative URLs resolve against the worker's own address.
  class WorkerRequest extends Request {
    constructor(/** @type {any} */ input, /** @type {any} */ init) { super(typeof input === 'string' ? abs(input) : input, init); }
  }
  const self = {
    location: new URL(`${ORIGIN}/sw.js`),
    addEventListener: (/** @type {string} */ type, /** @type {(e: any) => void} */ fn) => { on[type] = fn; },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  vm.runInNewContext(SOURCE, { self, caches, fetch: network, Request: WorkerRequest, Response, URL });

  /** Fires an event and waits for everything it asked to wait for. */
  async function fire(/** @type {string} */ type, props = {}) {
    /** @type {Promise<any>[]} */
    const waits = [];
    /** @type {Promise<Response> | undefined} */
    let response;
    on[type]({ ...props, waitUntil: (/** @type {Promise<any>} */ p) => waits.push(p), respondWith: (/** @type {Promise<Response>} */ p) => { response = p; } });
    const res = await response;
    for (let i = 0; i < waits.length; i++) await waits[i];
    return { res, responded: response !== undefined, waits: waits.length };
  }
  return { fire, store, precached };
}

const offline = async () => { throw new TypeError('Failed to fetch'); };
/** @param {string} path @param {string} [mode] */
const get = (path, mode = 'cors') => ({ request: { url: `${ORIGIN}${path}`, method: 'GET', mode } });

test('install stores every app file from the network, not from the browser cache', async () => {
  const w = worker(offline);
  await w.fire('install');
  assert.deepEqual(w.precached.map(abs), precacheList().map(abs));
  for (const r of w.precached) assert.equal(r.cache, 'reload', abs(r));
});

test('online, files come from the network and are kept for offline use', async () => {
  const w = worker(async () => new Response('fresh'));
  const { res, waits } = await w.fire('fetch', get('/src/main.js'));
  assert.equal(await res?.text(), 'fresh');
  assert.ok(waits > 0, 'the cache write keeps the worker alive');
  assert.ok(w.store.get(/** @type {string} */ (CACHE))?.has(`${ORIGIN}/src/main.js`));
});

test('offline, a page load falls back to the start page', async () => {
  const w = worker(offline);
  await w.fire('install');
  const { res } = await w.fire('fetch', get('/some/page', 'navigate'));
  assert.equal(await res?.text(), `cached ${ORIGIN}/`);
});

test('offline, a missing file is an error, not the start page', async () => {
  const w = worker(offline);
  await w.fire('install');
  const { res } = await w.fire('fetch', get('/data/missing.json'));
  assert.equal(res?.type, 'error');
  const hit = await w.fire('fetch', get('/data/curriculum.json?v=2'));
  assert.equal(await hit.res?.text(), `cached ${ORIGIN}/data/curriculum.json`);
});

test('requests to other sites, and anything but GET, are left to the browser', async () => {
  const w = worker(async () => new Response('fresh'));
  assert.equal((await w.fire('fetch', { request: { url: 'https://fonts.bunny.net/css', method: 'GET', mode: 'cors' } })).responded, false);
  assert.equal((await w.fire('fetch', { request: { url: `${ORIGIN}/data/curriculum.json`, method: 'POST', mode: 'cors' } })).responded, false);
  assert.equal(w.store.size, 0);
});

test('a new version deletes the caches of older versions', async () => {
  const w = worker(offline);
  await w.fire('install');
  w.store.set('verbos-v1', new Map());
  await w.fire('activate');
  assert.deepEqual([...w.store.keys()], [CACHE]);
});
