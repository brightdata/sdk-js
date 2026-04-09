import type { Dispatcher } from 'undici';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { DiscoverService } from '../src/api/discover/service';
import { DiscoverJob } from '../src/api/discover/job';
import { DiscoverResult } from '../src/api/discover/result';
import { Transport } from '../src/core/transport';
import { ValidationError, APIError, TimeoutError } from '../src/utils/errors';

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

function mockRequestSequence(responses: Array<{ statusCode: number; body: string }>) {
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

// --- DiscoverService ---

describe('DiscoverService.trigger', () => {
    let service: DiscoverService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new DiscoverService({ transport: mockTransport });
    });

    test('returns DiscoverJob with taskId', async () => {
        mockRequest(200, JSON.stringify({ task_id: 'task_abc123' }));

        const job = await service.trigger('AI trends');
        expect(job).toBeInstanceOf(DiscoverJob);
        expect(job.taskId).toBe('task_abc123');
        expect(job.query).toBe('AI trends');
    });

    test('passes options as snake_case in body', async () => {
        mockRequest(200, JSON.stringify({ task_id: 'task_123' }));

        await service.trigger('test query', {
            intent: 'research',
            includeContent: true,
            country: 'US',
            numResults: 5,
        });

        const callBody = JSON.parse(
            vi.mocked(mockTransport.request).mock.calls[0][1]?.body as string,
        );
        expect(callBody.query).toBe('test query');
        expect(callBody.intent).toBe('research');
        expect(callBody.include_content).toBe(true);
        expect(callBody.country).toBe('us');
        expect(callBody.num_results).toBe(5);
    });

    test('validates empty query', async () => {
        await expect(service.trigger('')).rejects.toThrow(ValidationError);
    });

    test('throws on API error', async () => {
        mockRequest(500, 'Internal Server Error');
        await expect(service.trigger('test')).rejects.toThrow(APIError);
    });
});

describe('DiscoverService.search', () => {
    let service: DiscoverService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new DiscoverService({ transport: mockTransport });
    });

    test('triggers and returns DiscoverResult on success', async () => {
        const results = [
            { link: 'https://example.com', title: 'Example', description: 'desc', relevance_score: 0.95 },
        ];
        mockRequestSequence([
            { statusCode: 200, body: JSON.stringify({ task_id: 'task_abc' }) },
            { statusCode: 200, body: JSON.stringify({ status: 'done', results, duration_seconds: 3.5 }) },
        ]);

        const result = await service.search('test query');
        expect(result).toBeInstanceOf(DiscoverResult);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(results);
        expect(result.query).toBe('test query');
        expect(result.durationSeconds).toBe(3.5);
        expect(result.totalResults).toBe(1);
    });

    test('returns failed result on error status', async () => {
        mockRequestSequence([
            { statusCode: 200, body: JSON.stringify({ task_id: 'task_fail' }) },
            { statusCode: 200, body: JSON.stringify({ status: 'error' }) },
        ]);

        const result = await service.search('test');
        expect(result.success).toBe(false);
        expect(result.error).toContain('failed with status: error');
    });
});

// --- DiscoverJob ---

describe('DiscoverJob', () => {
    const mockOps = {
        pollOnce: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('status() calls pollOnce and returns status', async () => {
        mockOps.pollOnce.mockResolvedValueOnce({ status: 'processing' });

        const job = new DiscoverJob('task_123', mockOps, { query: 'test' });
        const status = await job.status();
        expect(status).toBe('processing');
        expect(mockOps.pollOnce).toHaveBeenCalledWith('task_123');
    });

    test('status(false) returns cached status', async () => {
        mockOps.pollOnce.mockResolvedValueOnce({ status: 'processing' });

        const job = new DiscoverJob('task_123', mockOps);
        await job.status();
        const cached = await job.status(false);
        expect(cached).toBe('processing');
        expect(mockOps.pollOnce).toHaveBeenCalledTimes(1);
    });

    test('wait() polls until done', async () => {
        mockOps.pollOnce
            .mockResolvedValueOnce({ status: 'processing' })
            .mockResolvedValueOnce({ status: 'processing' })
            .mockResolvedValueOnce({ status: 'done', results: [{ link: 'https://x.com' }], duration_seconds: 2 });

        const job = new DiscoverJob('task_123', mockOps);
        const result = await job.wait({ pollInterval: 10 });
        expect(result).toBe('done');
        expect(mockOps.pollOnce).toHaveBeenCalledTimes(3);
    });

    test('wait() throws TimeoutError on timeout', async () => {
        mockOps.pollOnce.mockResolvedValue({ status: 'processing' });

        const job = new DiscoverJob('task_123', mockOps);
        await expect(
            job.wait({ timeout: 50, pollInterval: 10 }),
        ).rejects.toThrow(TimeoutError);
    });

    test('wait() throws APIError on error status', async () => {
        mockOps.pollOnce.mockResolvedValueOnce({ status: 'error' });

        const job = new DiscoverJob('task_123', mockOps);
        await expect(job.wait({ pollInterval: 10 })).rejects.toThrow(APIError);
    });

    test('fetch() returns cached results after wait', async () => {
        const items = [{ link: 'https://a.com', title: 'A', description: 'd', relevance_score: 1 }];
        mockOps.pollOnce.mockResolvedValueOnce({ status: 'done', results: items });

        const job = new DiscoverJob('task_123', mockOps);
        await job.wait({ pollInterval: 10 });

        // fetch should use cache, not call pollOnce again
        const data = await job.fetch();
        expect(data).toEqual(items);
        expect(mockOps.pollOnce).toHaveBeenCalledTimes(1);
    });

    test('toResult() returns DiscoverResult on success', async () => {
        const items = [{ link: 'https://a.com', title: 'A', description: 'd', relevance_score: 0.9 }];
        mockOps.pollOnce.mockResolvedValueOnce({ status: 'done', results: items, duration_seconds: 1.5 });

        const job = new DiscoverJob('task_123', mockOps, { query: 'test q' });
        const result = await job.toResult({ pollInterval: 10 });

        expect(result).toBeInstanceOf(DiscoverResult);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(items);
        expect(result.query).toBe('test q');
        expect(result.taskId).toBe('task_123');
        expect(result.durationSeconds).toBe(1.5);
        expect(result.totalResults).toBe(1);
    });

    test('toResult() returns failed result on timeout', async () => {
        mockOps.pollOnce.mockResolvedValue({ status: 'processing' });

        const job = new DiscoverJob('task_123', mockOps, { query: 'test' });
        const result = await job.toResult({ timeout: 50, pollInterval: 10 });

        expect(result.success).toBe(false);
        expect(result.error).toContain('timed out');
    });

    test('toResult() returns failed result on error status', async () => {
        mockOps.pollOnce.mockResolvedValueOnce({ status: 'failed' });

        const job = new DiscoverJob('task_123', mockOps, { query: 'test' });
        const result = await job.toResult({ pollInterval: 10 });

        expect(result.success).toBe(false);
        expect(result.error).toContain('failed with status');
    });
});

// --- DiscoverResult ---

describe('DiscoverResult', () => {
    test('extends BaseResult', () => {
        const result = new DiscoverResult({
            success: true,
            data: [],
            query: 'test',
        });
        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
        expect(result.elapsedMs()).toBeNull();
    });

    test('toJSON includes discover-specific fields', () => {
        const result = new DiscoverResult({
            success: true,
            data: [{ link: 'https://x.com', title: 'X', description: 'd', relevance_score: 0.8 }],
            query: 'test query',
            intent: 'research',
            durationSeconds: 2.5,
            totalResults: 1,
            taskId: 'task_abc',
        });

        const json = result.toJSON();
        expect(json.query).toBe('test query');
        expect(json.intent).toBe('research');
        expect(json.durationSeconds).toBe(2.5);
        expect(json.totalResults).toBe(1);
        expect(json.taskId).toBe('task_abc');
    });

    test('toString shows query preview', () => {
        const result = new DiscoverResult({
            success: true,
            data: [],
            query: 'a very long query that exceeds fifty characters and should be truncated',
        });

        const str = result.toString();
        expect(str).toContain('DiscoverResult');
        expect(str).toContain('...');
    });

    test('defaults to null for optional fields', () => {
        const result = new DiscoverResult({ success: false, query: 'q' });
        expect(result.intent).toBeNull();
        expect(result.durationSeconds).toBeNull();
        expect(result.totalResults).toBeNull();
        expect(result.taskId).toBeNull();
    });
});
