import type { Dispatcher } from 'undici';
import { describe, it, expect, test, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { CrawlerService } from '../src/api/crawler/service';
import { CrawlResult } from '../src/api/crawler/result';
import { ScrapeJob } from '../src/api/scrape/job';
import { Transport } from '../src/core/transport';
import { ValidationError } from '../src/utils/errors';
import { assertSchema } from '../src/schemas/utils';
import {
    CrawlInputSchema,
    CrawlOptionsSchema,
    CrawlDownloadOptionsSchema,
} from '../src/schemas/crawler';
import type { SnapshotOperations } from '../src/types/datasets';

// ── Mocks ────────────────────────────────────────────────────────

const mockTransport = {
    request: vi.fn(),
    stream: vi.fn(),
} as unknown as Transport;

function mockRequest(statusCode: number, body: string) {
    vi.mocked(mockTransport.request).mockResolvedValue({
        statusCode,
        headers: {},
        trailers: {},
        opaque: null,
        context: {},
        body: { text: () => Promise.resolve(body) },
    } as unknown as Dispatcher.ResponseData);
}

function createMockSnapshotOps(): SnapshotOperations {
    return {
        getStatus: vi.fn(),
        fetch: vi.fn(),
        download: vi.fn(),
        cancel: vi.fn(),
    };
}

// ── Schemas ──────────────────────────────────────────────────────

describe('CrawlInputSchema', () => {
    it('accepts a URL string', () => {
        expect(assertSchema(CrawlInputSchema, 'https://example.com')).toBe(
            'https://example.com',
        );
    });

    it('accepts a non-empty list of URLs', () => {
        expect(
            assertSchema(CrawlInputSchema, [
                'https://example.com',
                'https://example.com/about',
            ]),
        ).toEqual(['https://example.com', 'https://example.com/about']);
    });

    it('rejects an empty list', () => {
        expect(() => assertSchema(CrawlInputSchema, [])).toThrow(
            ValidationError,
        );
    });

    it('rejects a non-URL string', () => {
        expect(() => assertSchema(CrawlInputSchema, 'not-a-url')).toThrow(
            ValidationError,
        );
    });
});

describe('CrawlOptionsSchema', () => {
    it('defaults includeErrors to true', () => {
        expect(assertSchema(CrawlOptionsSchema, {})).toEqual({
            includeErrors: true,
        });
    });

    it('accepts explicit includeErrors: false', () => {
        expect(
            assertSchema(CrawlOptionsSchema, { includeErrors: false }),
        ).toEqual({ includeErrors: false });
    });

    it('rejects non-boolean includeErrors', () => {
        expect(() =>
            assertSchema(CrawlOptionsSchema, {
                includeErrors: 'yes' as unknown as boolean,
            }),
        ).toThrow(ValidationError);
    });
});

describe('CrawlDownloadOptionsSchema', () => {
    it('accepts positive numbers', () => {
        expect(
            assertSchema(CrawlDownloadOptionsSchema, {
                pollInterval: 100,
                pollTimeout: 5000,
            }),
        ).toEqual({ pollInterval: 100, pollTimeout: 5000 });
    });

    it('accepts empty options', () => {
        expect(assertSchema(CrawlDownloadOptionsSchema, {})).toEqual({});
    });

    it('rejects zero pollInterval', () => {
        expect(() =>
            assertSchema(CrawlDownloadOptionsSchema, { pollInterval: 0 }),
        ).toThrow(ValidationError);
    });

    it('rejects negative pollTimeout', () => {
        expect(() =>
            assertSchema(CrawlDownloadOptionsSchema, { pollTimeout: -1 }),
        ).toThrow(ValidationError);
    });
});

// ── CrawlResult class ────────────────────────────────────────────

describe('CrawlResult', () => {
    it('toJSON includes pageCount and snapshotId', () => {
        const r = new CrawlResult({
            success: true,
            data: [{ url: 'https://example.com' }],
            pageCount: 1,
            snapshotId: 's_abc',
        });
        const json = r.toJSON();
        expect(json.pageCount).toBe(1);
        expect(json.snapshotId).toBe('s_abc');
        expect(json.success).toBe(true);
    });

    it('toJSON yields null fields when omitted', () => {
        const r = new CrawlResult({ success: false, error: 'boom' });
        const json = r.toJSON();
        expect(json.pageCount).toBeNull();
        expect(json.snapshotId).toBeNull();
        expect(json.error).toBe('boom');
    });

    it('toString includes pages and truncated snapshot_id', () => {
        const r = new CrawlResult({
            success: true,
            pageCount: 2,
            snapshotId: 's_1234567890abcdef',
        });
        const str = r.toString();
        expect(str).toContain('pages=2');
        expect(str).toContain('snapshot_id=s_1234567890');
        expect(str).toContain('CrawlResult');
    });

    it('toString omits page/snapshot suffixes when null', () => {
        const r = new CrawlResult({ success: false, error: 'x' });
        const str = r.toString();
        expect(str).not.toContain('pages=');
        expect(str).not.toContain('snapshot_id=');
    });

    it('elapsedMs works when both timestamps are set', () => {
        const t0 = new Date(1_000_000);
        const t1 = new Date(1_001_500);
        const r = new CrawlResult({
            success: true,
            triggerSentAt: t0,
            dataFetchedAt: t1,
        });
        expect(r.elapsedMs()).toBe(1500);
    });
});

// ── crawl() — sync inline ────────────────────────────────────────

describe('CrawlerService.crawl', () => {
    let service: CrawlerService;
    let snapshotOps: SnapshotOperations;

    beforeEach(() => {
        vi.clearAllMocks();
        snapshotOps = createMockSnapshotOps();
        service = new CrawlerService({
            transport: mockTransport,
            snapshotOps,
        });
    });

    test('single URL — wraps single record into CrawlResult', async () => {
        mockRequest(
            200,
            JSON.stringify({ url: 'https://example.com', markdown: '# Hi' }),
        );

        const r = await service.crawl('https://example.com');
        expect(r).toBeInstanceOf(CrawlResult);
        expect(r.success).toBe(true);
        expect(r.pageCount).toBe(1);
        expect(r.data).toHaveLength(1);
        expect(r.data?.[0]?.url).toBe('https://example.com');
        expect(r.data?.[0]?.markdown).toBe('# Hi');
    });

    test('multi URL — pageCount matches array length', async () => {
        mockRequest(
            200,
            JSON.stringify([
                { url: 'https://example.com', markdown: 'a' },
                { url: 'https://example.com/about', markdown: 'b' },
            ]),
        );

        const r = await service.crawl([
            'https://example.com',
            'https://example.com/about',
        ]);
        expect(r.success).toBe(true);
        expect(r.pageCount).toBe(2);
        expect(r.data).toHaveLength(2);
    });

    test('HTTP 500 — wrapped into CrawlResult(success=false), no throw', async () => {
        mockRequest(500, 'upstream error');

        const r = await service.crawl('https://example.com');
        expect(r.success).toBe(false);
        expect(r.error).toBeTruthy();
        expect(r.pageCount).toBeNull();
    });

    test('network error — wrapped into CrawlResult(success=false), no throw', async () => {
        vi.mocked(mockTransport.request).mockRejectedValue(
            new Error('socket hang up'),
        );

        const r = await service.crawl('https://example.com');
        expect(r.success).toBe(false);
        expect(r.error).toContain('socket hang up');
    });

    test('validation error on URL — throws ValidationError', async () => {
        await expect(service.crawl('not-a-url')).rejects.toThrow(
            ValidationError,
        );
    });

    test('NDJSON response body — parsed correctly', async () => {
        const body = [
            JSON.stringify({ url: 'https://example.com/a', markdown: 'a' }),
            JSON.stringify({ url: 'https://example.com/b', markdown: 'b' }),
        ].join('\n');
        mockRequest(200, body);

        const r = await service.crawl([
            'https://example.com/a',
            'https://example.com/b',
        ]);
        expect(r.success).toBe(true);
        expect(r.pageCount).toBe(2);
        expect(r.data?.[1]?.url).toBe('https://example.com/b');
    });

    test('sends correct dataset_id, body shape, and include_errors flag', async () => {
        mockRequest(200, JSON.stringify([{ url: 'https://example.com' }]));

        await service.crawl(['https://example.com', 'https://example.com/1'], {
            includeErrors: false,
        });

        const call = vi.mocked(mockTransport.request).mock.calls[0];
        const url = call[0];
        const opts = call[1] as Record<string, unknown>;
        expect(url).toContain('/datasets/v3/scrape');
        expect(opts.method).toBe('POST');
        expect(opts.query).toEqual({
            dataset_id: 'gd_m6gjtfmeh43we6cqc',
            notify: 'false',
            include_errors: 'false',
        });
        const body = JSON.parse(opts.body as string) as {
            input: { url: string }[];
        };
        expect(body.input).toEqual([
            { url: 'https://example.com' },
            { url: 'https://example.com/1' },
        ]);
    });
});

// ── trigger() — async start ──────────────────────────────────────

describe('CrawlerService.trigger', () => {
    let service: CrawlerService;
    let snapshotOps: SnapshotOperations;

    beforeEach(() => {
        vi.clearAllMocks();
        snapshotOps = createMockSnapshotOps();
        service = new CrawlerService({
            transport: mockTransport,
            snapshotOps,
        });
    });

    test('returns ScrapeJob with snapshotId and platform=crawler', async () => {
        mockRequest(200, JSON.stringify({ snapshot_id: 's_xyz' }));

        const job = await service.trigger('https://example.com');
        expect(job).toBeInstanceOf(ScrapeJob);
        expect(job.snapshotId).toBe('s_xyz');
        expect(job.platform).toBe('crawler');
    });

    test('hits the trigger endpoint with the right dataset_id', async () => {
        mockRequest(200, JSON.stringify({ snapshot_id: 's_xyz' }));

        await service.trigger(['https://example.com']);

        const call = vi.mocked(mockTransport.request).mock.calls[0];
        expect(call[0]).toContain('/datasets/v3/trigger');
        expect(
            (call[1] as { query: Record<string, string> }).query.dataset_id,
        ).toBe('gd_m6gjtfmeh43we6cqc');
    });

    test('throws on HTTP 500', async () => {
        mockRequest(500, 'upstream error');
        await expect(service.trigger('https://example.com')).rejects.toThrow();
    });

    test('throws when response is missing snapshot_id', async () => {
        mockRequest(200, JSON.stringify({}));
        await expect(service.trigger('https://example.com')).rejects.toThrow();
    });

    test('throws ValidationError on bad URL', async () => {
        await expect(service.trigger('not-a-url')).rejects.toThrow(
            ValidationError,
        );
    });
});

// ── status() ─────────────────────────────────────────────────────

describe('CrawlerService.status', () => {
    let service: CrawlerService;
    let snapshotOps: SnapshotOperations;

    beforeEach(() => {
        snapshotOps = createMockSnapshotOps();
        service = new CrawlerService({
            transport: mockTransport,
            snapshotOps,
        });
    });

    test('returns the upstream status string', async () => {
        (snapshotOps.getStatus as Mock).mockResolvedValueOnce({
            status: 'running',
        });
        const s = await service.status('s_abc');
        expect(s).toBe('running');
        expect(snapshotOps.getStatus).toHaveBeenCalledWith('s_abc');
    });

    test('propagates upstream errors', async () => {
        (snapshotOps.getStatus as Mock).mockRejectedValueOnce(
            new Error('upstream'),
        );
        await expect(service.status('s_abc')).rejects.toThrow('upstream');
    });
});

// ── download() — poll + fetch via ScrapeJob.toResult ─────────────

describe('CrawlerService.download', () => {
    let service: CrawlerService;
    let snapshotOps: SnapshotOperations;

    beforeEach(() => {
        snapshotOps = createMockSnapshotOps();
        service = new CrawlerService({
            transport: mockTransport,
            snapshotOps,
        });
    });

    test('returns CrawlResult(success=true) once snapshot is ready', async () => {
        (snapshotOps.getStatus as Mock)
            .mockResolvedValueOnce({ status: 'running' })
            .mockResolvedValueOnce({ status: 'ready' });
        (snapshotOps.fetch as Mock).mockResolvedValueOnce([
            { url: 'https://example.com', markdown: '# Hi' },
        ]);

        const r = await service.download('s_abc', {
            pollInterval: 10,
            pollTimeout: 5000,
        });

        expect(r).toBeInstanceOf(CrawlResult);
        expect(r.success).toBe(true);
        expect(r.snapshotId).toBe('s_abc');
        expect(r.pageCount).toBe(1);
        expect(r.data?.[0]?.url).toBe('https://example.com');
    });

    test('returns CrawlResult(success=false) on polling timeout', async () => {
        (snapshotOps.getStatus as Mock).mockResolvedValue({ status: 'running' });

        const r = await service.download('s_abc', {
            pollInterval: 20,
            pollTimeout: 60,
        });

        expect(r.success).toBe(false);
        expect(r.error).toBeTruthy();
    });

    test('rejects negative pollInterval before doing any HTTP', async () => {
        await expect(
            service.download('s_abc', { pollInterval: -1 }),
        ).rejects.toThrow(ValidationError);
        expect(snapshotOps.getStatus).not.toHaveBeenCalled();
    });
});
