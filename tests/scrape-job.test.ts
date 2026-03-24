import type { Mock } from 'vitest';
import { describe, expect, test, vi } from 'vitest';
import { ScrapeJob } from '../src/api/scrape/job';
import { ScrapeResult } from '../src/models/result';
import { DataNotReadyError, TimeoutError } from '../src/utils/errors';
import type { SnapshotOperations } from '../src/types/datasets';

function createMockSnapshotOps(): SnapshotOperations {
    return {
        getStatus: vi.fn(),
        fetch: vi.fn(),
        download: vi.fn(),
        cancel: vi.fn(),
    };
}

describe('ScrapeJob', () => {
    test('constructor sets defaults', () => {
        const ops = createMockSnapshotOps();
        const job = new ScrapeJob('snap_123', ops);
        expect(job.snapshotId).toBe('snap_123');
        expect(job.platform).toBeNull();
        expect(job.triggeredAt).toBeInstanceOf(Date);
    });

    test('toString() includes platform and truncated snapshot_id', () => {
        const ops = createMockSnapshotOps();
        const job = new ScrapeJob('snap_1234567890abcdef', ops, {
            platform: 'amazon',
        });
        expect(job.toString()).toBe(
            '<ScrapeJob amazon snapshot_id=snap_1234567...>',
        );
    });

    test('status() delegates to snapshotOps.getStatus', async () => {
        const ops = createMockSnapshotOps();
        (ops.getStatus as Mock).mockResolvedValueOnce({ status: 'running' });
        const job = new ScrapeJob('snap_123', ops);
        const status = await job.status();
        expect(status).toBe('running');
        expect(ops.getStatus).toHaveBeenCalledWith('snap_123');
    });

    test('status(refresh=false) returns cached value', async () => {
        const ops = createMockSnapshotOps();
        (ops.getStatus as Mock)
            .mockResolvedValueOnce({ status: 'running' })
            .mockResolvedValueOnce({ status: 'ready' });
        const job = new ScrapeJob('snap_123', ops);
        await job.status();
        const cached = await job.status(false);
        expect(cached).toBe('running');
        expect(ops.getStatus).toHaveBeenCalledTimes(1);
    });

    test('wait() resolves when status is ready', async () => {
        const ops = createMockSnapshotOps();
        (ops.getStatus as Mock)
            .mockResolvedValueOnce({ status: 'running' })
            .mockResolvedValueOnce({ status: 'ready' });
        const job = new ScrapeJob('snap_123', ops);
        const result = await job.wait({
            pollInterval: 10,
            pollTimeout: 5000,
        });
        expect(result).toBe('ready');
    });

    test('wait() throws TimeoutError on timeout', async () => {
        const ops = createMockSnapshotOps();
        (ops.getStatus as Mock).mockResolvedValue({ status: 'running' });
        const job = new ScrapeJob('snap_123', ops);
        await expect(
            job.wait({ pollInterval: 50, pollTimeout: 120 }),
        ).rejects.toThrow(TimeoutError);
    });

    test('fetch() delegates to snapshotOps.fetch', async () => {
        const ops = createMockSnapshotOps();
        const mockData = [{ title: 'Product A' }];
        (ops.fetch as Mock).mockResolvedValueOnce(mockData);
        const job = new ScrapeJob('snap_123', ops);
        const data = await job.fetch();
        expect(data).toEqual(mockData);
        expect(ops.fetch).toHaveBeenCalledWith('snap_123', undefined);
    });

    test('download() delegates to snapshotOps.download', async () => {
        const ops = createMockSnapshotOps();
        (ops.download as Mock).mockResolvedValueOnce('/tmp/data.json');
        const job = new ScrapeJob('snap_123', ops);
        const path = await job.download({
            statusPolling: false,
            format: 'json',
            compress: false,
        });
        expect(path).toBe('/tmp/data.json');
    });

    test('cancel() delegates to snapshotOps.cancel', async () => {
        const ops = createMockSnapshotOps();
        (ops.cancel as Mock).mockResolvedValueOnce(undefined);
        const job = new ScrapeJob('snap_123', ops);
        await job.cancel();
        expect(ops.cancel).toHaveBeenCalledWith('snap_123');
    });

    test('toResult() waits then fetches', async () => {
        const ops = createMockSnapshotOps();
        (ops.getStatus as Mock)
            .mockResolvedValueOnce({ status: 'running' })
            .mockResolvedValueOnce({ status: 'ready' });
        (ops.fetch as Mock).mockResolvedValueOnce([{ id: 1 }]);
        const job = new ScrapeJob('snap_123', ops);
        const result = await job.toResult({ pollInterval: 10 });
        expect(result).toBeInstanceOf(ScrapeResult);
        expect(result.success).toBe(true);
        expect(result.data).toEqual([{ id: 1 }]);
        expect(result.snapshotId).toBe('snap_123');
        expect(result.status).toBe('ready');
    });

    test('toResult() retries on DataNotReadyError (ready→202 race)', async () => {
        const ops = createMockSnapshotOps();
        (ops.getStatus as Mock)
            .mockResolvedValueOnce({ status: 'ready' })
            .mockResolvedValueOnce({ status: 'ready' });
        (ops.fetch as Mock)
            .mockRejectedValueOnce(new DataNotReadyError())
            .mockResolvedValueOnce([{ id: 1 }]);
        const job = new ScrapeJob('snap_123', ops);
        const result = await job.toResult({ pollInterval: 10 });
        expect(result).toBeInstanceOf(ScrapeResult);
        expect(result.success).toBe(true);
        expect(result.data).toEqual([{ id: 1 }]);
        expect(ops.fetch).toHaveBeenCalledTimes(2);
    });

    test('toResult() returns timeout result when deadline expires', async () => {
        const ops = createMockSnapshotOps();
        (ops.getStatus as Mock).mockResolvedValue({ status: 'running' });
        const job = new ScrapeJob('snap_123', ops, { platform: 'amazon' });
        const result = await job.toResult({
            pollInterval: 50,
            pollTimeout: 120,
        });
        expect(result).toBeInstanceOf(ScrapeResult);
        expect(result.success).toBe(false);
        expect(result.status).toBe('timeout');
        expect(result.platform).toBe('amazon');
        expect(result.snapshotId).toBe('snap_123');
    });
});
