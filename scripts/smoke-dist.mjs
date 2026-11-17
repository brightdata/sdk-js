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
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';

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

// Exercise package exports (not Vitest source resolution) and the real client
// composition. Only redirect the destination to this temporary local HTTP peer.
for (const format of ['esm', 'cjs']) {
    let client;
    let server;
    try {
        const sdk =
            format === 'esm'
                ? await import('@brightdata/sdk')
                : require('@brightdata/sdk');
        const search =
            format === 'esm'
                ? await import('@brightdata/sdk/search')
                : require('@brightdata/sdk/search');
        assert.equal(sdk.BrightSearchPage, search.BrightSearchPage);
        assert.equal(sdk.BrightSearchService, search.BrightSearchService);
        assert.equal(sdk.BusinessSearchService, search.BusinessSearchService);
        assert.equal(sdk.EcommerceSearchService, search.EcommerceSearchService);
        const body = {
            req_id: 'dist-smoke',
            source: 'linkedin_company',
            meta: { matched: 0, coverage_percent: 100, offset: 0, limit: 10 },
            documents: [],
            extra: { retained: true },
        };
        assert.equal(new search.BrightSearchPage(body).toJSON(), body);
        const sources = {
            '/search/company': 'linkedin_company',
            '/search/people': 'linkedin_people',
            '/search/ecommerce': 'retail_products_live',
        };
        const requests = [];
        server = createServer(async (req, res) => {
            const chunks = [];
            for await (const chunk of req) chunks.push(Buffer.from(chunk));
            requests.push({
                path: req.url,
                method: req.method,
                body: JSON.parse(Buffer.concat(chunks).toString()),
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ...body, source: sources[req.url] }));
        });
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const origin = `http://127.0.0.1:${server.address().port}`;
        client = new sdk.bdclient({ apiKey: API_KEY, autoCreateZones: true });
        const request = client.transport.request.bind(client.transport);
        client.transport.request = (url, options) =>
            request(`${origin}${new URL(url).pathname}`, options);
        assert.ok(
            client.search.business instanceof search.BusinessSearchService,
        );
        assert.ok(
            client.search.ecommerce instanceof search.EcommerceSearchService,
        );
        const pages = [
            await client.search.business.companies('smoke', {
                mode: 'instant',
            }),
            await client.search.business.people('smoke', { mode: 'smart' }),
            await client.search.ecommerce.products({}, { mode: 'ludicrous' }),
        ];
        for (const [index, source] of Object.values(sources).entries()) {
            assert.ok(pages[index] instanceof search.BrightSearchPage);
            assert.deepEqual(pages[index].toJSON(), { ...body, source });
        }
        assert.deepEqual(requests, [
            {
                path: '/search/company',
                method: 'POST',
                body: { mode: 'instant', query: 'smoke', offset: 0, limit: 10 },
            },
            {
                path: '/search/people',
                method: 'POST',
                body: { mode: 'smart', query: 'smoke', offset: 0, limit: 10 },
            },
            {
                path: '/search/ecommerce',
                method: 'POST',
                body: { mode: 'ludicrous', query: {}, offset: 0, limit: 10 },
            },
        ]);
        console.log(
            `  ✓ ${format} Bright Search grouped exports and all three client routes`,
        );
    } catch (err) {
        failures++;
        console.error(`  ✗ ${format} Bright Search: ${err.message}`);
    } finally {
        await client?.close();
        if (server) {
            server.closeAllConnections();
            await new Promise((resolve) => server.close(resolve));
        }
    }
}

try {
    execFileSync(
        process.execPath,
        [
            path.join(here, '..', 'node_modules', 'typescript', 'bin', 'tsc'),
            '--noEmit',
            '--strict',
            '--target',
            'ESNext',
            '--module',
            'NodeNext',
            '--moduleResolution',
            'NodeNext',
            '--skipLibCheck',
            '--types',
            'node',
            path.join(here, '..', 'tests', 'types', 'bright-search.mts'),
        ],
        { stdio: 'inherit', cwd: path.join(here, '..') },
    );
    console.log('  ✓ Bright Search NodeNext declaration consumer');
} catch {
    failures++;
    console.error('  ✗ Bright Search NodeNext declaration consumer');
}

if (failures > 0) {
    console.error(
        `\nsmoke-dist: ${failures} entry/format combination(s) failed to load from dist/.`,
    );
    process.exit(1);
}

console.log(
    'smoke-dist: all 4 entries load in ESM/CJS; Bright Search client calls and NodeNext declarations pass.',
);
