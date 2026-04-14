import type { Dispatcher } from 'undici';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { ScraperStudioService } from '../src/api/scraperstudio/service';
import { ScraperStudioJob } from '../src/api/scraperstudio/job';
import { Transport } from '../src/core/transport';
import {
    ValidationError,
    APIError,
    DataNotReadyError,
    NetworkError,
    TimeoutError,
} from '../src/utils/errors';

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
        body: {
            text: () => Promise.resolve(body),
        },
    } as unknown as Dispatcher.ResponseData);
}

function mockRequestSequence(
    responses: Array<{ statusCode: number; body: string }>,
) {
    const mock = vi.mocked(mockTransport.request);
    for (const r of responses) {
        mock.mockResolvedValueOnce({
            statusCode: r.statusCode,
            headers: {},
            trailers: {},
            opaque: null,
            context: {},
            body: {
                text: () => Promise.resolve(r.body),
            },
        } as unknown as Dispatcher.ResponseData);
    }
}

// --- ScraperStudioService.trigger ---

describe('ScraperStudioService.trigger', () => {
    let service: ScraperStudioService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ScraperStudioService({ transport: mockTransport });
    });

    test('returns ScraperStudioJob with responseId', async () => {
        mockRequest(200, JSON.stringify({ response_id: 'resp_abc123' }));

        const job = await service.trigger('c_test', { url: 'https://example.com' });
        expect(job).toBeInstanceOf(ScraperStudioJob);
        expect(job.responseId).toBe('resp_abc123');
    });

    test('sends collector as query param', async () => {
        mockRequest(200, JSON.stringify({ response_id: 'resp_123' }));

        await service.trigger('c_mycollector', { url: 'https://example.com' });

        expect(mockTransport.request).toHaveBeenCalledWith(
            expect.stringContaining('trigger_immediate'),
            expect.objectContaining({
                query: { collector: 'c_mycollector' },
            }),
        );
    });

    test('sends input as POST body', async () => {
        mockRequest(200, JSON.stringify({ response_id: 'resp_123' }));

        await service.trigger('c_test', { url: 'https://example.com', custom: 'field' });

        const callBody = JSON.parse(
            vi.mocked(mockTransport.request).mock.calls[0][1]?.body as string,
        );
        expect(callBody.url).toBe('https://example.com');
        expect(callBody.custom).toBe('field');
    });

    test('validates empty collector ID', async () => {
        await expect(
            service.trigger('', { url: 'https://example.com' }),
        ).rejects.toThrow(ValidationError);
    });

    test('throws on API error', async () => {
        mockRequest(500, 'Internal Server Error');
        await expect(
            service.trigger('c_test', { url: 'https://example.com' }),
        ).rejects.toThrow(APIError);
    });
});

// --- ScraperStudioService.run ---

describe('ScraperStudioService.run', () => {
    let service: ScraperStudioService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ScraperStudioService({ transport: mockTransport });
    });

    test('single input — triggers, polls, returns RunResult', async () => {
        const data = [{ title: 'Product A', price: 29.99 }];
        mockRequestSequence([
            // trigger
            { statusCode: 200, body: JSON.stringify({ response_id: 'resp_1' }) },
            // first fetch → 202
            { statusCode: 202, body: 'not ready' },
            // second fetch → 200
            { statusCode: 200, body: JSON.stringify(data) },
        ]);

        const results = await service.run('c_test', {
            input: { url: 'https://example.com' },
            pollInterval: 10,
        });

        expect(results).toHaveLength(1);
        expect(results[0].data).toEqual(data);
        expect(results[0].error).toBeNull();
        expect(results[0].responseId).toBe('resp_1');
        expect(results[0].elapsedMs).toBeGreaterThan(0);
        expect(results[0].input).toEqual({ url: 'https://example.com' });
    });

    test('array input — triggers each, returns per-input results', async () => {
        const data1 = [{ title: 'A' }];
        const data2 = [{ title: 'B' }];
        mockRequestSequence([
            // trigger 1
            { statusCode: 200, body: JSON.stringify({ response_id: 'resp_1' }) },
            // fetch 1
            { statusCode: 200, body: JSON.stringify(data1) },
            // trigger 2
            { statusCode: 200, body: JSON.stringify({ response_id: 'resp_2' }) },
            // fetch 2
            { statusCode: 200, body: JSON.stringify(data2) },
        ]);

        const results = await service.run('c_test', {
            input: [{ url: 'https://a.com' }, { url: 'https://b.com' }],
            pollInterval: 10,
        });

        expect(results).toHaveLength(2);
        expect(results[0].data).toEqual(data1);
        expect(results[0].responseId).toBe('resp_1');
        expect(results[1].data).toEqual(data2);
        expect(results[1].responseId).toBe('resp_2');
    });

    test('captures per-input errors without aborting', async () => {
        mockRequestSequence([
            // trigger 1 → fails
            { statusCode: 500, body: 'Internal Server Error' },
            // trigger 2 → succeeds
            { statusCode: 200, body: JSON.stringify({ response_id: 'resp_2' }) },
            // fetch 2
            { statusCode: 200, body: JSON.stringify([{ title: 'B' }]) },
        ]);

        const results = await service.run('c_test', {
            input: [{ url: 'https://a.com' }, { url: 'https://b.com' }],
            pollInterval: 10,
        });

        expect(results).toHaveLength(2);
        expect(results[0].data).toBeNull();
        expect(results[0].error).toBeTruthy();
        expect(results[1].data).toEqual([{ title: 'B' }]);
        expect(results[1].error).toBeNull();
    });
});

// --- ScraperStudioService.status ---

describe('ScraperStudioService.status', () => {
    let service: ScraperStudioService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ScraperStudioService({ transport: mockTransport });
    });

    test('returns normalized JobStatus', async () => {
        mockRequest(
            200,
            JSON.stringify({
                id: 'j_abc',
                status: 'done',
                collector: 'c_test',
                inputs: 1,
                lines: 5,
                fails: 0,
                success_rate: 1,
                created: '2026-04-01T00:00:00Z',
            }),
        );

        const status = await service.status('j_abc');
        expect(status.id).toBe('j_abc');
        expect(status.status).toBe('done');
        expect(status.collector).toBe('c_test');
        expect(status.successRate).toBe(1);
    });

    test('handles mixed-case API response fields', async () => {
        mockRequest(
            200,
            JSON.stringify({
                Id: 'j_mixed',
                Status: 'running',
                Collector: 'c_mixed',
                Inputs: 2,
                Lines: 10,
                Fails: 1,
                Success_rate: 0.5,
                Created: '2026-04-01T00:00:00Z',
                Job_time: 5000,
                Queue_time: 100,
            }),
        );

        const status = await service.status('j_mixed');
        expect(status.id).toBe('j_mixed');
        expect(status.status).toBe('running');
        expect(status.collector).toBe('c_mixed');
        expect(status.successRate).toBe(0.5);
        expect(status.jobTime).toBe(5000);
        expect(status.queueTime).toBe(100);
    });

    test('rejects response missing status field', async () => {
        mockRequest(200, JSON.stringify({ id: 'j_abc' }));
        await expect(service.status('j_abc')).rejects.toThrow(APIError);
    });
});

// --- ScraperStudioService.fetch ---

describe('ScraperStudioService.fetch', () => {
    let service: ScraperStudioService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ScraperStudioService({ transport: mockTransport });
    });

    test('returns data on 200', async () => {
        const data = [{ title: 'Test' }];
        mockRequest(200, JSON.stringify(data));

        const result = await service.fetch('resp_123');
        expect(result).toEqual(data);
    });

    test('throws DataNotReadyError on 202', async () => {
        mockRequest(202, 'not ready');
        await expect(service.fetch('resp_123')).rejects.toThrow(
            DataNotReadyError,
        );
    });
});

// --- ScraperStudioJob ---

describe('ScraperStudioJob', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('fetch() returns data on 200', async () => {
        const data = [{ title: 'Product' }];
        mockRequest(200, JSON.stringify(data));

        const job = new ScraperStudioJob('resp_123', mockTransport);
        const result = await job.fetch();
        expect(result).toEqual(data);
    });

    test('fetch() throws DataNotReadyError on 202', async () => {
        mockRequest(202, 'not ready');

        const job = new ScraperStudioJob('resp_123', mockTransport);
        await expect(job.fetch()).rejects.toThrow(DataNotReadyError);
    });

    test('fetch() consumes body on 202', async () => {
        const textFn = vi.fn().mockResolvedValue('not ready');
        vi.mocked(mockTransport.request).mockResolvedValue({
            statusCode: 202,
            headers: {},
            trailers: {},
            opaque: null,
            context: {},
            body: { text: textFn },
        } as unknown as Dispatcher.ResponseData);

        const job = new ScraperStudioJob('resp_123', mockTransport);
        await expect(job.fetch()).rejects.toThrow(DataNotReadyError);
        expect(textFn).toHaveBeenCalled();
    });

    test('waitAndFetch() retries on DataNotReadyError', async () => {
        const data = [{ title: 'Ready' }];
        mockRequestSequence([
            { statusCode: 202, body: 'not ready' },
            { statusCode: 202, body: 'not ready' },
            { statusCode: 200, body: JSON.stringify(data) },
        ]);

        const job = new ScraperStudioJob('resp_123', mockTransport);
        const result = await job.waitAndFetch({ pollInterval: 10 });
        expect(result).toEqual(data);
        expect(mockTransport.request).toHaveBeenCalledTimes(3);
    });

    test('waitAndFetch() retries on transient NetworkError', async () => {
        const data = [{ title: 'OK' }];
        const mock = vi.mocked(mockTransport.request);

        // First call: network error
        mock.mockRejectedValueOnce(new NetworkError('ECONNRESET'));
        // Second call: success
        mock.mockResolvedValueOnce({
            statusCode: 200,
            headers: {},
            trailers: {},
            opaque: null,
            context: {},
            body: { text: () => Promise.resolve(JSON.stringify(data)) },
        } as unknown as Dispatcher.ResponseData);

        const job = new ScraperStudioJob('resp_123', mockTransport);
        const result = await job.waitAndFetch({ pollInterval: 10 });
        expect(result).toEqual(data);
        expect(mock).toHaveBeenCalledTimes(2);
    });

    test('waitAndFetch() throws TimeoutError', async () => {
        mockRequest(202, 'not ready');

        const job = new ScraperStudioJob('resp_123', mockTransport);
        await expect(
            job.waitAndFetch({ timeout: 50, pollInterval: 10 }),
        ).rejects.toThrow(TimeoutError);
    });

    test('waitAndFetch() passes response_id as query param', async () => {
        const data = [{ id: 1 }];
        mockRequest(200, JSON.stringify(data));

        const job = new ScraperStudioJob('resp_abc', mockTransport);
        await job.waitAndFetch({ pollInterval: 10 });

        expect(mockTransport.request).toHaveBeenCalledWith(
            expect.stringContaining('get_result'),
            expect.objectContaining({
                query: { response_id: 'resp_abc' },
            }),
        );
    });
});
