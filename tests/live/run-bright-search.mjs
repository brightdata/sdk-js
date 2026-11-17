#!/usr/bin/env node
// Explicit live runner. Merely importing it or running without --live is offline.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
export const DEFAULT_CASES = join(here, 'bright_search_cases.json');
const ROUTES = {
    company: ['business', 'companies'],
    people: ['business', 'people'],
    ecommerce: ['ecommerce', 'products'],
};
const SOURCES = {
    company: 'linkedin_company',
    people: 'linkedin_people',
    ecommerce: 'retail_products_live',
};
const ID_FIELDS = {
    company: ['company_id', 'linkedin_id'],
    people: ['linkedin_num_id', 'linkedin_person_id'],
    ecommerce: [],
};
const REQUEST_KEYS = new Set([
    'query',
    'mode',
    'source',
    'view',
    'offset',
    'limit',
]);
const EXPECT_KEYS = new Set([
    'outcome',
    'source',
    'status_code',
    'min_documents',
    'max_documents',
    'min_coverage_percent',
    'max_latency_ms',
]);
const object = (value) =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

export function loadCases(path = DEFAULT_CASES) {
    const text = readFileSync(path, 'utf8');
    const config = JSON.parse(text);
    if (
        !object(config) ||
        config.schema_version !== 1 ||
        !Array.isArray(config.cases) ||
        !config.cases.length
    ) {
        throw new Error(
            'Case file requires schema_version=1 and a nonempty cases array',
        );
    }
    const ids = new Set();
    for (const c of config.cases) {
        if (!object(c) || typeof c.id !== 'string' || !c.id || ids.has(c.id))
            throw new Error('Case IDs must be unique nonempty strings');
        ids.add(c.id);
        if (
            !Object.hasOwn(ROUTES, c.category) ||
            !['smoke', 'edge', 'extended'].includes(c.group)
        )
            throw new Error(`${c.id}: invalid category/group`);
        if (!['esm', 'cjs'].includes(c.client ?? 'esm'))
            throw new Error(`${c.id}: invalid client format`);
        if (
            !object(c.request) ||
            !Object.hasOwn(c.request, 'query') ||
            !Object.hasOwn(c.request, 'mode') ||
            Object.keys(c.request).some((key) => !REQUEST_KEYS.has(key))
        )
            throw new Error(
                `${c.id}: invalid request keys (debug controls are excluded)`,
            );
        if (
            !object(c.expect) ||
            Object.keys(c.expect).some((key) => !EXPECT_KEYS.has(key)) ||
            !['success', 'api_error', 'validation_error'].includes(
                c.expect.outcome,
            )
        )
            throw new Error(`${c.id}: invalid expectations`);
        const e = c.expect;
        if (
            e.outcome === 'api_error' &&
            (!Number.isInteger(e.status_code) ||
                e.status_code < 400 ||
                e.status_code > 599)
        )
            throw new Error(`${c.id}: api_error requires status_code 400–599`);
        for (const name of ['min_documents', 'max_documents']) {
            if (
                e[name] !== undefined &&
                (!Number.isSafeInteger(e[name]) || e[name] < 0)
            )
                throw new Error(`${c.id}: invalid ${name}`);
        }
        for (const [name, max] of [
            ['min_coverage_percent', 100],
            ['max_latency_ms', Infinity],
        ]) {
            if (
                e[name] !== undefined &&
                (typeof e[name] !== 'number' ||
                    !Number.isFinite(e[name]) ||
                    e[name] < 0 ||
                    e[name] > max)
            )
                throw new Error(`${c.id}: invalid ${name}`);
        }
        if (e.source !== undefined && typeof e.source !== 'string')
            throw new Error(`${c.id}: invalid expected source`);
        if ((e.min_documents ?? 0) > (e.max_documents ?? Infinity))
            throw new Error(`${c.id}: conflicting document bounds`);
        if (
            e.outcome === 'success' &&
            (e.min_documents ?? 0) > (c.request.limit ?? 10)
        )
            throw new Error(
                `${c.id}: minimum documents exceeds requested limit`,
            );
    }
    return {
        ...config,
        config_sha256: createHash('sha256').update(text).digest('hex'),
    };
}

export function selectCases(cases, group = 'all', ids = []) {
    if (!['all', 'smoke', 'edge', 'extended'].includes(group))
        throw new Error('Unknown case group');
    for (const id of ids)
        if (!cases.some((c) => c.id === id))
            throw new Error(`Unknown case: ${id}`);
    return cases.filter((c) =>
        ids.length ? ids.includes(c.id) : group === 'all' || c.group === group,
    );
}

export async function loadSDKs() {
    // Unit tests inject source SDKs and run before dist exists. Resolve the
    // built package only when this standalone runner is actually invoked.
    const entry = '@brightdata/sdk';
    return {
        esm: await import(/* @vite-ignore */ entry),
        cjs: require(entry),
    };
}

function search(client, category, query, options) {
    const [namespace, method] = ROUTES[category];
    return client.search[namespace][method](query, options);
}

// Observe actual SDK preflight through its public router. The sentinel transport cannot
// make a network request or load credentials, including for positive cases.
export async function preflight(cases, sdks) {
    for (const c of cases) {
        const sdk = sdks[c.client ?? 'esm'];
        const reachedTransport = new Error('offline preflight boundary');
        const client = {
            search: new sdk.SearchRouter({
                transport: {
                    request: () => {
                        throw reachedTransport;
                    },
                },
                zonesAPI: {
                    ensureZone: () => {
                        throw new Error('Bright Search must not create zones');
                    },
                },
                autoCreateZones: true,
            }),
        };
        const { query, ...options } = c.request;
        try {
            await search(client, c.category, query, options);
            throw new Error(
                `${c.id}: service bypassed the preflight transport`,
            );
        } catch (error) {
            const localRejection =
                error instanceof sdk.ValidationError && !error.context;
            if (
                c.expect.outcome === 'validation_error'
                    ? !localRejection
                    : error !== reachedTransport
            ) {
                throw new Error(
                    `${c.id}: SDK preflight disagrees with ${c.expect.outcome}: ${error.message}`,
                );
            }
        }
    }
}

export function preview(cases, maxRequests = 40) {
    if (!Number.isSafeInteger(maxRequests) || maxRequests < 1)
        throw new Error('max-requests must be a positive integer');
    if (!cases.length) throw new Error('No cases selected');
    const local = cases.filter(
        (c) => c.expect.outcome === 'validation_error',
    ).length;
    const planned = cases.length - local;
    if (planned > maxRequests)
        throw new Error(
            `Planned ${planned} HTTP attempts exceed max-requests ${maxRequests}`,
        );
    return {
        selected_cases: cases.length,
        planned_http_attempts: planned,
        local_validation_cases: local,
        max_http_attempts: maxRequests,
        case_ids: cases.map((c) => c.id),
    };
}

export function checkPage(c, page) {
    const errors = [],
        notes = [];
    const r = c.request,
        e = c.expect;
    if (e.outcome !== 'success')
        errors.push(`Expected ${e.outcome}, received a page`);
    if (!page.reqId) errors.push('Request ID missing');
    if (page.source !== (e.source ?? r.source ?? SOURCES[c.category]))
        errors.push('Unexpected source');
    for (const [key, fallback] of [
        ['offset', 0],
        ['limit', 10],
    ]) {
        if (page.meta[key] !== (r[key] ?? fallback))
            errors.push(`meta.${key} does not echo request`);
    }
    const count = page.documents.length;
    if (
        count > (r.limit ?? 10) ||
        count < (e.min_documents ?? 0) ||
        count > (e.max_documents ?? Infinity)
    )
        errors.push('Document count outside expectation');
    if (
        page.meta.coverage_percent < (e.min_coverage_percent ?? 0) ||
        page.meta.coverage_percent > 100 ||
        page.meta.matched < 0
    )
        errors.push('Invalid coverage/matched metadata');
    if (page.meta.coverage_percent < 100)
        notes.push('Partial coverage; complete results are not established');
    const view = r.view ?? 'id_only';
    const fields = [
        ...new Set(page.documents.flatMap((d) => Object.keys(d.data))),
    ].sort();
    if (
        view === 'id_only' &&
        fields.some((field) => !ID_FIELDS[c.category].includes(field))
    )
        errors.push('ID-only projection includes descriptive fields');
    if (object(view)) {
        if (fields.some((field) => !view.fields.includes(field)))
            errors.push('Custom projection includes unrequested fields');
        if (!fields.length)
            notes.push(
                'No projected fields observed; projection is unqualified',
            );
    } else if (
        ['summary', 'full'].includes(view) &&
        !fields.some((field) => !ID_FIELDS[c.category].includes(field))
    )
        notes.push('No descriptive fields observed; projection is unqualified');
    if (!count)
        notes.push('Empty page; entity-level checks were not exercised');
    if (JSON.stringify(page) !== JSON.stringify(page.raw))
        errors.push('Serialization changed the response body');
    return { errors, notes, fields };
}

function git(...args) {
    try {
        return execFileSync('git', args, {
            cwd: join(here, '..', '..'),
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch {
        return null;
    }
}

export async function runCases(catalog, options) {
    const {
        sdks,
        maxRequests = 40,
        timeout = 30_000,
        delay = 500,
        keepGoing = false,
        output,
        onSample = () => {},
    } = options;
    const cases = catalog.cases;
    const planned = preview(cases, maxRequests);
    if (
        !Number.isSafeInteger(timeout) ||
        timeout < 1 ||
        timeout > 2_147_483_647 ||
        !Number.isFinite(delay) ||
        delay < 0
    )
        throw new Error('Invalid timeout/delay');
    await preflight(cases, sdks);
    const report = {
        schema_version: 1,
        started_at: new Date().toISOString(),
        state: 'running',
        node: process.version,
        sdk_version: sdks.esm.VERSION,
        git_head: git('rev-parse', 'HEAD'),
        working_tree_dirty: Boolean(git('status', '--porcelain')),
        config_sha256: catalog.config_sha256,
        provenance: catalog.provenance,
        ...planned,
        settings: { timeout_ms: timeout, delay_ms: delay, concurrency: 1 },
        case_definitions: cases,
        samples: [],
        dispatched_requests: 0,
        interpretation:
            'One pass, no retries. Latencies include network/provider/SDK work; no latency SLA or ranking-quality claim. Records and credentials are omitted. Dispatch counts cannot establish whether an ambiguous network failure reached the server.',
    };
    const secrets = new Set();
    const redact = (value) => {
        if (typeof value !== 'string') return value;
        for (const secret of secrets)
            if (secret) value = value.split(secret).join('[redacted]');
        return value;
    };
    const save = () => {
        report.totals = {
            completed_cases: report.samples.length,
            passed: report.samples.filter((s) => s.verdict === 'passed').length,
            failed: report.samples.filter((s) => s.verdict === 'failed').length,
            local_validation_passes: report.samples.filter(
                (s) =>
                    s.outcome === 'validation_error' && s.verdict === 'passed',
            ).length,
            http_responses_observed: report.samples.filter(
                (s) => s.http_status !== undefined,
            ).length,
            dispatched_requests: report.dispatched_requests,
            cases_with_notes: report.samples.filter((s) => s.notes?.length)
                .length,
            remaining_cases: cases.length - report.samples.length,
        };
        if (output)
            writeFileSync(
                output,
                JSON.stringify(report, (_key, value) => redact(value), 2) +
                    '\n',
            );
    };
    if (output) {
        mkdirSync(dirname(output), { recursive: true });
        writeFileSync(output, '', { flag: 'wx' });
    }
    const clients = new Map();
    let current;
    try {
        save();
        for (const c of cases) {
            current = c;
            const format = c.client ?? 'esm',
                sdk = sdks[format];
            if (!clients.has(format)) {
                const client = new sdk.bdclient({
                    autoCreateZones: false,
                    timeout,
                });
                clients.set(format, client);
                const authorization = client.transport.headers.Authorization;
                if (authorization?.startsWith('Bearer '))
                    secrets.add(authorization.slice(7));
                const request = client.transport.request.bind(client.transport);
                client.transport.request = (url, opts) => {
                    if (current.expect.outcome === 'validation_error')
                        throw new Error(
                            'Local validation case attempted HTTP dispatch; blocked',
                        );
                    if (report.dispatched_requests >= maxRequests)
                        throw new Error('HTTP request budget exhausted');
                    if (
                        String(url) !==
                            `https://api.brightdata.com/search/${current.category}` ||
                        opts?.method !== 'POST' ||
                        opts?.singleAttempt !== true
                    )
                        throw new Error(
                            'Unexpected endpoint or request policy; dispatch blocked',
                        );
                    report.dispatched_requests++;
                    return request(url, opts);
                };
            }
            const client = clients.get(format);
            const row = {
                case_id: c.id,
                category: c.category,
                client: format,
                mode: c.request.mode,
            };
            const { query, ...requestOptions } = c.request;
            const start = performance.now();
            try {
                const page = await search(client, c.category, query, {
                    ...requestOptions,
                    timeout,
                });
                row.latency_ms =
                    Math.round((performance.now() - start) * 1000) / 1000;
                if (!(page instanceof sdk.BrightSearchPage))
                    throw new Error('Unexpected result type');
                const checked = checkPage(c, page);
                Object.assign(row, {
                    outcome: 'success',
                    verdict: checked.errors.length ? 'failed' : 'passed',
                    http_status: 200,
                    req_id: page.reqId,
                    source: page.source,
                    documents: page.documents.length,
                    matched: page.meta.matched,
                    coverage_percent: page.meta.coverage_percent,
                    offset: page.meta.offset,
                    limit: page.meta.limit,
                    returned_fields: checked.fields,
                    json_bytes: Buffer.byteLength(JSON.stringify(page)),
                    checks_failed: checked.errors,
                    notes: checked.notes,
                });
            } catch (error) {
                row.latency_ms ??=
                    Math.round((performance.now() - start) * 1000) / 1000;
                const ctx = error.context;
                const local = error instanceof sdk.ValidationError && !ctx;
                const expected =
                    c.expect.outcome === 'validation_error'
                        ? local
                        : c.expect.outcome === 'api_error' &&
                          error instanceof sdk.BRDError &&
                          ctx?.statusCode === c.expect.status_code &&
                          Boolean(ctx.reqId);
                Object.assign(row, {
                    outcome: local ? 'validation_error' : 'error',
                    verdict: expected ? 'passed' : 'failed',
                    error_type: error.name,
                    error_message: redact(error.message),
                    http_status: ctx?.statusCode,
                    req_id: ctx?.reqId,
                    api_error_code: redact(ctx?.responseJson?.error_code),
                    api_error: redact(ctx?.responseJson?.error),
                    retry_after: ctx?.responseHeaders?.['retry-after'],
                });
            }
            if (row.latency_ms > (c.expect.max_latency_ms ?? Infinity)) {
                row.verdict = 'failed';
                (row.checks_failed ??= []).push(
                    'Configured latency bound exceeded',
                );
            }
            report.samples.push(row);
            save();
            onSample(row);
            if (
                [401, 403, 429].includes(row.http_status) ||
                (row.verdict === 'failed' && !keepGoing)
            ) {
                report.state = 'stopped_after_failure';
                break;
            }
            if (report.samples.length < cases.length && delay)
                await new Promise((resolve) => setTimeout(resolve, delay));
        }
        if (report.state === 'running') report.state = 'completed';
    } catch (error) {
        report.state = 'runner_error';
        report.runner_error = {
            type: error.name,
            message: redact(error.message),
        };
    } finally {
        const closed = await Promise.allSettled(
            [...clients.values()].map((client) => client.close()),
        );
        const failures = closed.filter(
            (result) => result.status === 'rejected',
        );
        if (failures.length) {
            report.state = 'runner_error';
            report.cleanup_errors = failures.map((result) =>
                redact(String(result.reason?.message ?? result.reason)),
            );
        }
        report.finished_at = new Date().toISOString();
        save();
    }
    return report;
}

export async function main(args = process.argv.slice(2)) {
    const { values } = parseArgs({
        args,
        options: {
            live: { type: 'boolean', default: false },
            cases: { type: 'string', default: DEFAULT_CASES },
            group: { type: 'string', default: 'all' },
            case: { type: 'string', multiple: true, default: [] },
            'max-requests': { type: 'string', default: '40' },
            'keep-going': { type: 'boolean', default: false },
            'timeout-ms': { type: 'string', default: '30000' },
            'delay-ms': { type: 'string', default: '500' },
            output: { type: 'string' },
        },
    });
    const config = loadCases(values.cases);
    config.cases = selectCases(config.cases, values.group, values.case);
    const maxRequests = Number(values['max-requests']);
    const plan = preview(config.cases, maxRequests);
    const sdks = await loadSDKs();
    await preflight(config.cases, sdks);
    console.log(JSON.stringify({ live: values.live, ...plan }, null, 2));
    if (!values.live) return 0;
    // Credential lookup happens only after explicit live opt-in and preflight.
    await import('dotenv/config');
    const output = resolve(
        values.output ??
            join(
                here,
                'results',
                `bright-search-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
            ),
    );
    console.log(`Report: ${output}`);
    const report = await runCases(config, {
        sdks,
        maxRequests,
        output,
        keepGoing: values['keep-going'],
        timeout: Number(values['timeout-ms']),
        delay: Number(values['delay-ms']),
        onSample: (row) =>
            console.log(
                `${row.case_id}: ${row.verdict}; ${row.http_status ?? row.outcome}; ${row.latency_ms} ms`,
            ),
    });
    console.log(
        JSON.stringify({ state: report.state, ...report.totals }, null, 2),
    );
    return Number(report.state === 'runner_error' || report.totals.failed > 0);
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
    main()
        .then((code) => {
            process.exitCode = code;
        })
        .catch((error) => {
            console.error(error.message);
            process.exitCode = 1;
        });
}
