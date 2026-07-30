import { describe, expect, test, vi } from 'vitest';

// Simulate Bun's bundled undici. Verified against real Bun (1.3.11 and
// 1.3.14): its `Agent` is a bare, largely-inert stub — no `compose`, no
// `close`, no `dispatch` anywhere on the instance or its prototype chain
// (just an EventEmitter shell) — and `interceptors` only exposes
// redirect/retry/dump (`dns` is absent). Before the fix, Transport called
// `dns()` unconditionally (issue #24) and, even after that fix, still called
// `.compose(...)` and `.close()` unconditionally — both throw under this
// shape. vi.mock is hoisted above the imports below, so Transport captures
// this shape at module load — exactly as it would on real Bun.
vi.mock('undici', () => ({
    request: vi.fn(),
    stream: vi.fn(),
    Agent: vi.fn(() => ({
        // Intentionally no compose/close/dispatch — matches real Bun.
    })),
    interceptors: {
        // `dns` intentionally omitted — this is the Bun shape.
        redirect: vi.fn(() => vi.fn()),
        retry: vi.fn(() => vi.fn()),
        dump: vi.fn(() => vi.fn()),
    },
}));

import * as undici from 'undici';
import { Transport } from '../src/core/transport';
import { bdclient } from '../src/index';

describe('Transport under a Bun-shaped undici (no `compose`/`close`/`dns`)', () => {
    test('Transport constructor does not throw when compose/dns are absent', () => {
        expect(() => new Transport({ apiKey: 'test-key' })).not.toThrow();
    });

    test('bdclient constructor does not throw (the issue #24 repro)', () => {
        expect(
            () => new bdclient({ apiKey: 'test-key-1234567890' }),
        ).not.toThrow();
    });

    test('Transport.close() does not throw when the stub Agent has no close()', async () => {
        const transport = new Transport({ apiKey: 'test-key' });
        await expect(transport.close()).resolves.toBeUndefined();
    });

    test('bdclient full construct → close lifecycle does not throw', async () => {
        const client = new bdclient({ apiKey: 'test-key-1234567890' });
        await expect(client.close()).resolves.toBeUndefined();
    });

    test('builds the interceptor chain but never calls the absent compose()', () => {
        const retry = vi.mocked(undici.interceptors.retry);
        retry.mockClear();

        new Transport({ apiKey: 'test-key' });

        // The interceptor chain is still built from whatever's available
        // (retry is present on Bun) — it's just never handed to compose(),
        // since compose() itself doesn't exist on the stub Agent.
        expect(retry).toHaveBeenCalled();
        expect('dns' in undici.interceptors).toBe(false);
    });
});

