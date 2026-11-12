import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as sdk from '../src/index';
import { withHTTPContext } from '../src/utils/errors';
import {
    checkPage,
    loadCases,
    preflight,
    preview,
    runCases,
    selectCases,
} from './live/run-bright-search.mjs';

const directories: string[] = [];
afterEach(() => {
    for (const directory of directories.splice(0))
        rmSync(directory, { recursive: true, force: true });
});
function temporary() {
    const directory = mkdtempSync(join(tmpdir(), 'bright-search-runner-'));
    directories.push(directory);
    return directory;
}
function page() {
    return new sdk.BrightSearchPage({
        req_id: 'test-id',
        source: 'linkedin_company',
        meta: { matched: 5, coverage_percent: 80, offset: 0, limit: 1 },
        documents: [
            {
                bright_id: 'id',
                data: { name: 'An entity name that must not be saved' },
            },
        ],
    });
}
function oneCase() {
    return {
        id: 'one',
        group: 'smoke',
        category: 'company',
        request: {
            query: { equals: { headquarters_country_code: 'US' } },
            mode: 'ludicrous',
            view: 'summary',
            limit: 1,
        },
        expect: { outcome: 'success', min_documents: 1 },
    };
}
function harness(handler = async () => page()) {
    const network = vi.fn(handler);
    const close = vi.fn(async () => {});
    const client: any = {
        transport: {
            headers: { Authorization: 'Bearer secret-test-token' },
            request: network,
        },
        search: { business: {} },
        close,
    };
    const service = new sdk.BrightSearchService(client.transport);
    client.search.business.companies = (query: any, opts: any) =>
        service.search('company', query, opts);
    // The real service expects an HTTP response. Tests exercising a successful
    // page still cross the runner's dispatch guard before returning that page.
    client.search.business.companies = async (_query: any, opts: any) =>
        client.transport.request('https://api.brightdata.com/search/company', {
            method: 'POST',
            singleAttempt: true,
            body: '{}',
            timeout: opts.timeout,
        });
    const construct = vi.fn(function () {
        return client;
    });
    const module = { ...sdk, bdclient: construct };
    return {
        client,
        network,
        close,
        construct,
        sdks: { esm: module, cjs: module },
        service,
    };
}

describe('40-case Bright Search live runner (offline)', () => {
    it('loads forty cases with thirty-four HTTP attempts and six local checks', () => {
        const catalog = loadCases();
        expect(catalog.cases).toHaveLength(40);
        expect(preview(catalog.cases)).toMatchObject({
            selected_cases: 40,
            planned_http_attempts: 34,
            local_validation_cases: 6,
            max_http_attempts: 40,
        });
        expect(catalog.cases.filter((c) => c.client === 'cjs')).toHaveLength(3);
        expect(selectCases(catalog.cases, 'smoke')).toHaveLength(7);
        expect(selectCases(catalog.cases, 'edge')).toHaveLength(5);
        expect(selectCases(catalog.cases, 'extended')).toHaveLength(28);
        expect(() => selectCases(catalog.cases, 'all', ['missing'])).toThrow(
            'Unknown case',
        );
    });
    it('preflights all forty against the actual SDK without constructing a client', async () => {
        const construct = vi.fn(() => {
            throw new Error('must not load credentials');
        });
        const module = { ...sdk, bdclient: construct };
        await preflight(loadCases().cases, { esm: module, cjs: module });
        expect(construct).not.toHaveBeenCalled();
    });
    it('catches case expectations that disagree with actual SDK validation', async () => {
        const c = oneCase();
        c.expect.outcome = 'validation_error';
        await expect(preflight([c], { esm: sdk, cjs: sdk })).rejects.toThrow(
            'preflight disagrees',
        );
    });
    it('rejects excess budget before client construction', async () => {
        const h = harness();
        await expect(
            runCases(loadCases(), { sdks: h.sdks, maxRequests: 33, delay: 0 }),
        ).rejects.toThrow('exceed');
        expect(h.construct).not.toHaveBeenCalled();
    });
    it.each([
        (c: any) => {
            c.request.debug = { trace: true };
        },
        (c: any) => {
            c.expect.min_documents = 2;
        },
        (c: any) => {
            c.expect.min_documents = 2;
            c.expect.max_documents = 1;
        },
        (c: any) => {
            c.expect.outcome = 'api_error';
            c.expect.status_code = 200;
        },
        (c: any) => {
            c.client = 'sync';
        },
    ])('rejects invalid catalog definitions %#', (edit) => {
        const c = oneCase();
        edit(c);
        const path = join(temporary(), 'cases.json');
        writeFileSync(path, JSON.stringify({ schema_version: 1, cases: [c] }));
        expect(() => loadCases(path)).toThrow();
    });
    it('keeps empty/partial/unqualified pages visible', () => {
        const c = oneCase(),
            p = page();
        expect(checkPage(c, p).notes.join(' ')).toContain('Partial coverage');
        p.raw.documents = [];
        expect(checkPage(c, p).errors).toContain(
            'Document count outside expectation',
        );
        expect(checkPage(c, p).notes.join(' ')).toContain('unqualified');
        c.request.view = { fields: ['name'] } as any;
        p.raw.documents = [{ bright_id: 'id', data: { unrequested: true } }];
        expect(checkPage(c, p).errors).toContain(
            'Custom projection includes unrequested fields',
        );
    });
    it('checkpoints metadata without recording returned entities', async () => {
        const h = harness();
        const output = join(temporary(), 'report.json');
        const report = await runCases(
            { cases: [oneCase()] },
            { sdks: h.sdks, output, delay: 0 },
        );
        expect(report.totals).toMatchObject({
            passed: 1,
            failed: 0,
            dispatched_requests: 1,
            cases_with_notes: 1,
        });
        const saved = readFileSync(output, 'utf8');
        expect(saved).not.toContain('An entity name that must not be saved');
        expect(saved).not.toContain('secret-test-token');
        expect(saved).toContain('test-id');
        expect(h.close).toHaveBeenCalledOnce();
        await expect(
            runCases(
                { cases: [oneCase()] },
                { sdks: h.sdks, output, delay: 0 },
            ),
        ).rejects.toThrow();
        expect(h.construct).toHaveBeenCalledOnce();
    });
    it('recognizes an HTTP 400 ValidationError as a remote error, not a local pass', async () => {
        const h = harness(async () => {
            throw withHTTPContext(new sdk.ValidationError('bad field'), {
                statusCode: 400,
                reqId: 'remote-id',
                responseHeaders: {},
                url: 'u',
                method: 'POST',
            });
        });
        const c = oneCase();
        c.expect = { outcome: 'api_error', status_code: 400 } as any;
        const report = await runCases(
            { cases: [c] },
            { sdks: h.sdks, delay: 0 },
        );
        expect(report.totals).toMatchObject({
            passed: 1,
            dispatched_requests: 1,
            local_validation_passes: 0,
        });
    });
    it.each([401, 403, 429])(
        'stops HTTP %s without retries even with keep-going',
        async (status) => {
            const h = harness(async () => {
                throw withHTTPContext(
                    new sdk.AuthenticationError('denied secret-test-token'),
                    {
                        statusCode: status,
                        reqId: 'denied',
                        responseHeaders: {},
                        url: 'u',
                        method: 'POST',
                    },
                );
            });
            const report = await runCases(
                { cases: [oneCase(), { ...oneCase(), id: 'two' }] },
                { sdks: h.sdks, delay: 0, keepGoing: true },
            );
            expect(report.state).toBe('stopped_after_failure');
            expect(h.network).toHaveBeenCalledOnce();
            expect(report.samples[0].error_message).toContain('[redacted]');
            expect(report.totals.remaining_cases).toBe(1);
        },
    );
    it('blocks accidental dispatch from a local-negative case', async () => {
        const h = harness();
        const c = oneCase();
        c.request.limit = -1;
        c.expect = { outcome: 'validation_error' } as any;
        const report = await runCases(
            { cases: [c] },
            { sdks: h.sdks, delay: 0 },
        );
        expect(report.samples[0].error_message).toContain('dispatch; blocked');
        expect(report.totals).toMatchObject({
            failed: 1,
            dispatched_requests: 0,
        });
        expect(h.network).not.toHaveBeenCalled();
    });
    it('records real local SDK rejections with zero dispatches', async () => {
        const h = harness();
        h.client.search.business.companies = (query: any, options: any) =>
            h.service.search('company', query, options);
        const c = oneCase();
        c.request.limit = -1;
        c.expect = { outcome: 'validation_error' } as any;
        const report = await runCases(
            { cases: [c] },
            { sdks: h.sdks, delay: 0 },
        );
        expect(report.totals).toMatchObject({
            passed: 1,
            dispatched_requests: 0,
            local_validation_passes: 1,
        });
    });
    it('enforces the remaining dispatch budget if a caller tries a second request', async () => {
        const h = harness();
        const original = h.client.search.business.companies;
        h.client.search.business.companies = async (...args: any[]) => {
            await original(...args);
            return original(...args);
        };
        const report = await runCases(
            { cases: [oneCase()] },
            { sdks: h.sdks, delay: 0, maxRequests: 1 },
        );
        expect(report.totals).toMatchObject({
            failed: 1,
            dispatched_requests: 1,
        });
        expect(h.network).toHaveBeenCalledOnce();
    });
    it('saves the final report even if cleanup fails', async () => {
        const h = harness();
        h.close.mockRejectedValueOnce(new Error('close secret-test-token'));
        const output = join(temporary(), 'report.json');
        const report = await runCases(
            { cases: [oneCase()] },
            { sdks: h.sdks, output, delay: 0 },
        );
        expect(report.state).toBe('runner_error');
        expect(report.cleanup_errors).toEqual(['close [redacted]']);
        expect(
            JSON.parse(readFileSync(output, 'utf8')).finished_at,
        ).toBeTruthy();
    });
});
