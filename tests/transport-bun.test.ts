import { describe, expect, test, vi } from 'vitest';

// Simulate Bun's bundled undici, whose interceptor polyfill ships only a
// subset (redirect/retry/dump) and omits `dns`. Before the fix, Transport
// called `dns()` unconditionally and crashed with "dns is not a function"
// (issue #24). This mock reproduces the Bun shape: `interceptors.dns` is
// absent. vi.mock is hoisted above the imports below, so Transport captures
// this dns-less shape at module load — exactly as it would on real Bun.
vi.mock('undici', () => ({
    request: vi.fn(),
    stream: vi.fn(),
    Agent: vi.fn(() => ({
        compose: vi.fn(() => ({ close: vi.fn() })),
        close: vi.fn(),
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

describe('Transport under a Bun-shaped undici (no `dns` interceptor)', () => {
    test('Transport constructor does not throw when interceptors.dns is absent', () => {
        expect(() => new Transport({ apiKey: 'test-key' })).not.toThrow();
    });

    test('bdclient constructor does not throw (the issue #24 repro)', () => {
        expect(
            () => new bdclient({ apiKey: 'test-key-1234567890' }),
        ).not.toThrow();
    });

    test('composes the present interceptor (retry) and skips the absent one (dns)', () => {
        const retry = vi.mocked(undici.interceptors.retry);
        retry.mockClear();

        new Transport({ apiKey: 'test-key' });

        // retry is present → it was invoked to build the interceptor.
        expect(retry).toHaveBeenCalled();
        // dns is absent entirely — there is nothing to call, and the lack of a
        // throw above is the assertion that the capability guard handled it.
        expect('dns' in undici.interceptors).toBe(false);
    });
});
