import { describe, expect, test, vi } from 'vitest';
import { pollUntilStatus } from '../src/utils/polling';
import { APIError, BRDError, TimeoutError } from '../src/utils/errors';

describe('pollUntilStatus', () => {
    test('resolves when status is ready', async () => {
        const getStatus = vi
            .fn()
            .mockResolvedValueOnce({ status: 'running' })
            .mockResolvedValueOnce({ status: 'running' })
            .mockResolvedValueOnce({ status: 'ready' });

        await pollUntilStatus('snap_123', getStatus, { pollInterval: 10 });
        expect(getStatus).toHaveBeenCalledTimes(3);
    });

    test('resolves immediately if already ready', async () => {
        const getStatus = vi.fn().mockResolvedValueOnce({ status: 'ready' });
        const start = Date.now();
        await pollUntilStatus('snap_123', getStatus, { pollInterval: 10_000 });
        expect(Date.now() - start).toBeLessThan(100);
        expect(getStatus).toHaveBeenCalledTimes(1);
    });

    test('throws TimeoutError when timeout exceeded', async () => {
        const getStatus = vi.fn().mockResolvedValue({ status: 'running' });
        await expect(
            pollUntilStatus('snap_123', getStatus, {
                pollInterval: 50,
                pollTimeout: 120,
            }),
        ).rejects.toThrow(TimeoutError);
    });

    test('throws BRDError when status is failed', async () => {
        const getStatus = vi.fn().mockResolvedValueOnce({ status: 'failed' });
        await expect(
            pollUntilStatus('snap_123', getStatus, { pollInterval: 10 }),
        ).rejects.toThrow(BRDError);
    });

    test('throws BRDError when status is error', async () => {
        const getStatus = vi.fn().mockResolvedValueOnce({ status: 'error' });
        await expect(
            pollUntilStatus('snap_123', getStatus, { pollInterval: 10 }),
        ).rejects.toThrow(BRDError);
    });

    test('calls onStatus callback on each poll', async () => {
        const getStatus = vi
            .fn()
            .mockResolvedValueOnce({ status: 'running' })
            .mockResolvedValueOnce({ status: 'ready' });
        const onStatus = vi.fn();

        await pollUntilStatus('snap_123', getStatus, {
            pollInterval: 10,
            onStatus,
        });

        expect(onStatus).toHaveBeenCalledTimes(2);
        expect(onStatus).toHaveBeenCalledWith('running', expect.any(Number));
        expect(onStatus).toHaveBeenCalledWith('ready', expect.any(Number));
    });

    test('propagates getStatus errors', async () => {
        const getStatus = vi
            .fn()
            .mockRejectedValueOnce(
                new APIError('API failure', 500, 'Internal Server Error'),
            );
        await expect(
            pollUntilStatus('snap_123', getStatus, { pollInterval: 10 }),
        ).rejects.toThrow(APIError);
    });
});
