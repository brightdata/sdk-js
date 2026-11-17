import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    request: vi.fn(),
    stream: vi.fn(),
    base: { dispatch: vi.fn(), close: vi.fn() },
    composed: { dispatch: vi.fn(), close: vi.fn() },
}));
vi.mock('undici', () => ({
    request: mocks.request,
    stream: mocks.stream,
    Agent: vi.fn(() => ({
        ...mocks.base,
        compose: vi.fn(() => mocks.composed),
    })),
    interceptors: { dns: vi.fn(() => vi.fn()), retry: vi.fn(() => vi.fn()) },
}));
import { Transport } from '../src/core/transport';
import {
    APIError,
    AuthenticationError,
    BRDError,
    NetworkError,
    NetworkTimeoutError,
    ValidationError,
    withHTTPContext,
} from '../src/utils/errors';
import { Agent } from 'undici';

describe('Bright Search shared compatibility boundaries', () => {
    const transports: Transport[] = [];
    afterEach(async () => {
        for (const t of transports.splice(0)) await t.close();
        vi.clearAllMocks();
    });
    function transport() {
        const t = new Transport({ apiKey: 'fake-key', rateLimit: 1 });
        transports.push(t);
        return t;
    }

    it('selects only the opted-in base dispatcher and keeps one close owner', async () => {
        mocks.request.mockResolvedValue({ statusCode: 200 });
        const t = transport();
        await t.request('http://example.test', {
            method: 'POST',
            singleAttempt: true,
        });
        const base = vi.mocked(Agent).mock.results[0].value;
        expect(mocks.request.mock.calls[0][1].dispatcher).toBe(base);
        expect(mocks.request.mock.calls[0][1]).not.toHaveProperty(
            'singleAttempt',
        );
        await t.request('http://example.test', {});
        expect(mocks.request.mock.calls[1][1].dispatcher).toBe(mocks.composed);
        await t.close();
        await t.close();
        expect(mocks.composed.close).toHaveBeenCalledOnce();
        expect(mocks.base.close).not.toHaveBeenCalled();
        await expect(
            t.request('http://example.test', { singleAttempt: true }),
        ).rejects.toThrow('Transport is closed');
    });

    it('keeps stream dispatch and authentication on the existing path', async () => {
        mocks.stream.mockResolvedValue({});
        const t = transport();
        await t.stream('http://example.test', { method: 'POST' }, () => {
            throw new Error('unused mocked factory');
        });
        expect(mocks.stream.mock.calls[0][1].dispatcher).toBe(mocks.composed);
        expect(mocks.stream.mock.calls[0][1].headers.Authorization).toBe(
            'Bearer fake-key',
        );
    });

    it('awaits the shared limiter before strict dispatch', async () => {
        mocks.request.mockResolvedValue({ statusCode: 200 });
        const t = transport();
        let release!: () => void;
        const limiter = (
            t as unknown as { rateLimiter: { acquire: () => Promise<void> } }
        ).rateLimiter;
        const acquire = vi.spyOn(limiter, 'acquire').mockImplementation(
            () =>
                new Promise((resolve) => {
                    release = resolve;
                }),
        );
        const pending = t.request('http://example.test', {
            singleAttempt: true,
        });
        expect(acquire).toHaveBeenCalledOnce();
        expect(mocks.request).not.toHaveBeenCalled();
        release();
        await pending;
        expect(mocks.request).toHaveBeenCalledOnce();
    });

    it.each([
        BRDError,
        ValidationError,
        AuthenticationError,
        NetworkError,
        NetworkTimeoutError,
    ])('leaves context-free %s property/JSON shape unchanged', (ErrorType) => {
        const error = new ErrorType('message');
        expect(Object.hasOwn(error, 'context')).toBe(false);
        expect(error.toJSON()).toEqual({
            name: error.name,
            message: 'message',
        });
        expect(JSON.stringify(error)).not.toContain('context');
    });
    it('preserves legacy APIError constructor/serialization and adds context only on opt-in', () => {
        const legacy = new APIError('failed', 502, 'body');
        expect(legacy.toJSON()).toEqual({
            name: 'APIError',
            message: 'failed [HTTP502] body',
            statusCode: 502,
            responseText: 'body',
        });
        expect(Object.hasOwn(legacy, 'context')).toBe(false);
        const context = {
            statusCode: 502,
            url: 'u',
            method: 'POST',
            responseHeaders: { 'retry-after': '2' },
        };
        const cause = new Error('read failure');
        const contextual = withHTTPContext(
            new APIError('failed', 502),
            context,
            cause,
        );
        expect(contextual).toBeInstanceOf(APIError);
        expect(contextual).toBeInstanceOf(BRDError);
        expect(contextual.cause).toBe(cause);
        expect(contextual.toJSON().context).toBe(context);
        expect(Object.keys(contextual)).not.toContain('cause');
    });
});
