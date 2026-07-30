#!/usr/bin/env node
// Built-package runtime smoke.
//
// Loads every published entry point against the *actual* dist/ output, in
// BOTH module formats (ESM via import(), CJS via require()), and constructs
// the client. A broken inter-module specifier surfaces here as a load-time
// throw (ERR_MODULE_NOT_FOUND / "Cannot find module") instead of in a
// consumer's app on the next release.
//
// Why this exists: the vitest suite runs src/ through the bundler, never the
// emitted dist/. After authoring `.js` extensions across every relative
// import in src/, "rollup exited 0" was the only thing standing behind the
// runtime output. This converts that into a real load of the shipped files.
// It is wired into `npm run build` (post-emit) rather than vitest, because CI
// runs the test suite before the build — the artifacts don't exist yet at
// test time.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url)); // scripts/
const dist = path.join(here, '..', 'dist');

// Mirror the key the unit tests construct with — long enough to pass apiKey
// validation, no network performed on construction.
const API_KEY = 'test-key-1234567890';

// One per `exports` entry in package.json.
const entries = [
    { name: '.', esm: 'esm/index.mjs', cjs: 'cjs/index.cjs', hasClient: true },
    {
        name: './scrapers',
        esm: 'esm/scrapers.mjs',
        cjs: 'cjs/scrapers.cjs',
        hasClient: false,
    },
    {
        name: './search',
        esm: 'esm/search.mjs',
        cjs: 'cjs/search.cjs',
        hasClient: false,
    },
    {
        name: './datasets',
        esm: 'esm/datasets.mjs',
        cjs: 'cjs/datasets.cjs',
        hasClient: false,
    },
];

function assertNonEmpty(mod, label) {
    const named = Object.keys(mod).filter((k) => k !== 'default');
    const total = named.length + (mod.default ? 1 : 0);
    if (total === 0) {
        throw new Error(`${label}: module loaded but exported nothing`);
    }
}

async function constructClient(mod, label) {
    const Ctor = mod.bdclient ?? mod.default?.bdclient;
    if (typeof Ctor !== 'function') {
        throw new Error(
            `${label}: bdclient export is not a constructor (got ${typeof Ctor})`,
        );
    }
    const client = new Ctor({ apiKey: API_KEY });
    if (!client) {
        throw new Error(`${label}: client construction returned falsy`);
    }
    // Best-effort cleanup so the undici agent doesn't keep the process alive.
    if (typeof client.close === 'function') {
        await client.close();
    }
}

let failures = 0;

for (const e of entries) {
    // ESM — exercises the import() resolution path.
    try {
        const mod = await import(path.join(dist, e.esm));
        assertNonEmpty(mod, `esm ${e.name}`);
        if (e.hasClient) await constructClient(mod, `esm ${e.name}`);
        console.log(`  ✓ esm  ${e.name}`);
    } catch (err) {
        failures++;
        console.error(`  ✗ esm  ${e.name}: ${err.message}`);
    }

    // CJS — exercises the require() resolution path.
    try {
        const mod = require(path.join(dist, e.cjs));
        assertNonEmpty(mod, `cjs ${e.name}`);
        if (e.hasClient) await constructClient(mod, `cjs ${e.name}`);
        console.log(`  ✓ cjs  ${e.name}`);
    } catch (err) {
        failures++;
        console.error(`  ✗ cjs  ${e.name}: ${err.message}`);
    }
}

if (failures > 0) {
    console.error(
        `\nsmoke-dist: ${failures} entry/format combination(s) failed to load from dist/.`,
    );
    process.exit(1);
}

console.log(
    'smoke-dist: all 4 entries load in both ESM and CJS; client constructs.',
);
