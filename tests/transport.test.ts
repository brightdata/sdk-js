import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { request as lib_request, stream as lib_stream, interceptors } from 'undici';
import { Transport } from '../src/core/transport';
import {
    BRDError,
    APIError,
    AuthenticationError,
    ValidationError,
    NetworkError,
    NetworkTimeoutError,
} from '../src/utils/errors';

vi.mock('undici', () => ({
    request: vi.fn(),
    stream: vi.fn(),
    Agent: vi.fn(() => ({
        compose: vi.fn(() => ({ close: vi.fn() })),
        close: vi.fn(),
    })),
    interceptors: {
        dns: vi.fn(() => vi.fn()),
        retry: vi.fn(() => vi.fn()),
    },
}));

const API_KEY = 'test-api-key';

describe('Transport lifecycle', () => {
    let transport: Transport;

    afterEach(async () => {
        try {
            await transport?.close();
        } catch {
            // ignore if already closed or not initialized
        }
    });

    describe('closed-state guard', () => {
        it('request() after close() throws BRDError', async () => {
            transport = new Transport({ apiKey: API_KEY });
            await transport.close();

            await expect(
                transport.request('https://example.com'),
            ).rejects.toThrow(BRDError);
        });

        it('stream() after close() throws BRDError', async () => {
            transport = new Transport({ apiKey: API_KEY });
            await transport.close();

            await expect(
                transport.stream('https://example.com', { method: 'GET' }, () => {
                    throw new Error('should not reach factory');
                }),
            ).rejects.toThrow(BRDError);
        });

        it('error message contains "Transport is closed"', async () => {
            transport = new Transport({ apiKey: API_KEY });
            await transport.close();

            await expect(
                transport.request('https://example.com'),
            ).rejects.toThrow(/Transport is closed/);
        });

        it('error is BRDError, not APIError', async () => {
            transport = new Transport({ apiKey: API_KEY });
            await transport.close();

            try {
                await transport.request('https://example.com');
            } catch (e) {
                expect(e).toBeInstanceOf(BRDError);
                expect((e as Error).name).toBe('BRDError');
            }
        });
    });

    describe('idempotent close', () => {
        it('close() twice does not throw', async () => {
            transport = new Transport({ apiKey: API_KEY });
            await transport.close();
            await expect(transport.close()).resolves.toBeUndefined();
        });

        it('close() then request() still throws closed error', async () => {
            transport = new Transport({ apiKey: API_KEY });
            await transport.close();
            await transport.close();

            await expect(
                transport.request('https://example.com'),
            ).rejects.toThrow(/Transport is closed/);
        });
    });

    describe('construction', () => {
        it('constructs with default options', () => {
            expect(() => {
                transport = new Transport({ apiKey: API_KEY });
            }).not.toThrow();
        });

        it('constructs with custom timeout', () => {
            expect(() => {
                transport = new Transport({ apiKey: API_KEY, timeout: 60_000 });
            }).not.toThrow();
        });

        it('constructs with custom connections', () => {
            expect(() => {
                transport = new Transport({ apiKey: API_KEY, connections: 100 });
            }).not.toThrow();
        });
    });

    describe('beforeExit warning', () => {
        it('warns when transport is not closed', () => {
            transport = new Transport({ apiKey: API_KEY });
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            process.emit('beforeExit', 0);

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Transport was not closed'),
            );
            warnSpy.mockRestore();
        });

        it('does not warn after close()', async () => {
            transport = new Transport({ apiKey: API_KEY });
            await transport.close();
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            process.emit('beforeExit', 0);

            expect(warnSpy).not.toHaveBeenCalledWith(
                expect.stringContaining('Transport was not closed'),
            );
            warnSpy.mockRestore();
        });
    });
});

describe('Transport.request()', () => {
    let transport: Transport;

    beforeEach(() => {
        vi.clearAllMocks();
        transport = new Transport({ apiKey: API_KEY });
    });

    afterEach(async () => {
        try { await transport?.close(); } catch { /* ignore */ }
    });

    it('successful request returns response data', async () => {
        const mockResponse = {
            statusCode: 200,
            headers: {},
            body: { text: () => Promise.resolve('ok') },
        };
        vi.mocked(lib_request).mockResolvedValue(mockResponse as never);

        const result = await transport.request('https://example.com');
        expect(result).toBe(mockResponse);
        expect(lib_request).toHaveBeenCalled();
    });

    it('ECONNREFUSED → NetworkError', async () => {
        vi.mocked(lib_request).mockRejectedValue(new Error('connect ECONNREFUSED'));

        await expect(
            transport.request('https://example.com'),
        ).rejects.toThrow(NetworkError);
    });

    it('HeadersTimeoutError → NetworkTimeoutError', async () => {
        const err = new Error('Headers Timeout');
        err.name = 'HeadersTimeoutError';
        vi.mocked(lib_request).mockRejectedValue(err);

        await expect(
            transport.request('https://example.com'),
        ).rejects.toThrow(NetworkTimeoutError);
    });

    it('BodyTimeoutError → NetworkTimeoutError', async () => {
        const err = new Error('Body Timeout');
        err.name = 'BodyTimeoutError';
        vi.mocked(lib_request).mockRejectedValue(err);

        await expect(
            transport.request('https://example.com'),
        ).rejects.toThrow(NetworkTimeoutError);
    });

    it('ConnectTimeoutError → NetworkTimeoutError', async () => {
        const err = new Error('Connect Timeout');
        err.name = 'ConnectTimeoutError';
        vi.mocked(lib_request).mockRejectedValue(err);

        await expect(
            transport.request('https://example.com'),
        ).rejects.toThrow(NetworkTimeoutError);
    });

    it('BRDError subtype rethrown as-is', async () => {
        const original = new AuthenticationError('bad key');
        vi.mocked(lib_request).mockRejectedValue(original);

        try {
            await transport.request('https://example.com');
            expect.unreachable('should have thrown');
        } catch (e) {
            expect(e).toBe(original);
        }
    });

    it('NetworkError includes cause', async () => {
        const cause = new Error('ECONNREFUSED');
        vi.mocked(lib_request).mockRejectedValue(cause);

        try {
            await transport.request('https://example.com');
            expect.unreachable('should have thrown');
        } catch (e) {
            expect(e).toBeInstanceOf(NetworkError);
            expect((e as NetworkError).cause).toBe(cause);
        }
    });

    it('NetworkTimeoutError includes cause', async () => {
        const cause = new Error('timed out');
        cause.name = 'HeadersTimeoutError';
        vi.mocked(lib_request).mockRejectedValue(cause);

        try {
            await transport.request('https://example.com');
            expect.unreachable('should have thrown');
        } catch (e) {
            expect(e).toBeInstanceOf(NetworkTimeoutError);
            expect((e as NetworkTimeoutError).cause).toBe(cause);
        }
    });

    it('works with rate limiter configured', async () => {
        const rateLimited = new Transport({ apiKey: API_KEY, rateLimit: 100 });
        const mockResponse = { statusCode: 200, headers: {}, body: {} };
        vi.mocked(lib_request).mockResolvedValue(mockResponse as never);

        const result = await rateLimited.request('https://example.com');
        expect(result).toBe(mockResponse);
        expect(lib_request).toHaveBeenCalled();
        await rateLimited.close();
    });
});

describe('Transport.stream()', () => {
    let transport: Transport;

    beforeEach(() => {
        vi.clearAllMocks();
        transport = new Transport({ apiKey: API_KEY });
    });

    afterEach(async () => {
        try { await transport?.close(); } catch { /* ignore */ }
    });

    it('successful stream returns stream data', async () => {
        const mockStreamData = { opaque: null, trailers: {} };
        vi.mocked(lib_stream).mockResolvedValue(mockStreamData as never);

        const factory = vi.fn();
        const result = await transport.stream(
            'https://example.com',
            { method: 'GET' },
            factory,
        );
        expect(result).toBe(mockStreamData);
    });

    it('network error → NetworkError', async () => {
        vi.mocked(lib_stream).mockRejectedValue(new Error('stream failed'));

        await expect(
            transport.stream('https://example.com', { method: 'GET' }, vi.fn()),
        ).rejects.toThrow(NetworkError);
    });

    it('timeout → NetworkTimeoutError', async () => {
        const err = new Error('timed out');
        err.name = 'HeadersTimeoutError';
        vi.mocked(lib_stream).mockRejectedValue(err);

        await expect(
            transport.stream('https://example.com', { method: 'GET' }, vi.fn()),
        ).rejects.toThrow(NetworkTimeoutError);
    });

    it('BRDError passthrough', async () => {
        const original = new AuthenticationError('nope');
        vi.mocked(lib_stream).mockRejectedValue(original);

        try {
            await transport.stream('https://example.com', { method: 'GET' }, vi.fn());
            expect.unreachable('should have thrown');
        } catch (e) {
            expect(e).toBe(original);
        }
    });
});

describe('AbortSignal timeout detection', () => {
    let transport: Transport;

    beforeEach(() => {
        vi.clearAllMocks();
        transport = new Transport({ apiKey: API_KEY });
    });

    afterEach(async () => {
        try { await transport?.close(); } catch { /* ignore */ }
    });

    it('DOMException name=TimeoutError → NetworkTimeoutError', async () => {
        const err = new Error('The operation was aborted');
        err.name = 'TimeoutError';
        vi.mocked(lib_request).mockRejectedValue(err);

        await expect(
            transport.request('https://example.com'),
        ).rejects.toThrow(NetworkTimeoutError);
    });

    it('AbortError with timeout message → NetworkTimeoutError', async () => {
        const err = new Error('The operation was aborted due to timeout');
        err.name = 'AbortError';
        vi.mocked(lib_request).mockRejectedValue(err);

        await expect(
            transport.request('https://example.com'),
        ).rejects.toThrow(NetworkTimeoutError);
    });

    it('AbortError without timeout message → NetworkError', async () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        vi.mocked(lib_request).mockRejectedValue(err);

        await expect(
            transport.request('https://example.com'),
        ).rejects.toThrow(NetworkError);
    });

    it('stream: DOMException name=TimeoutError → NetworkTimeoutError', async () => {
        const err = new Error('The operation was aborted');
        err.name = 'TimeoutError';
        vi.mocked(lib_stream).mockRejectedValue(err);

        await expect(
            transport.stream('https://example.com', { method: 'GET' }, vi.fn()),
        ).rejects.toThrow(NetworkTimeoutError);
    });
});

describe('RequestRetryError classification', () => {
    let transport: Transport;

    beforeEach(() => {
        vi.clearAllMocks();
        transport = new Transport({ apiKey: API_KEY });
    });

    afterEach(async () => {
        try { await transport?.close(); } catch { /* ignore */ }
    });

    function makeRetryError(statusCode: number) {
        const err = new Error('Request retry error') as Error & { statusCode: number };
        err.name = 'RequestRetryError';
        err.statusCode = statusCode;
        return err;
    }

    it('statusCode 429 → APIError', async () => {
        vi.mocked(lib_request).mockRejectedValue(makeRetryError(429));

        await expect(
            transport.request('https://example.com'),
        ).rejects.toThrow(APIError);
    });

    it('statusCode 500 → APIError', async () => {
        vi.mocked(lib_request).mockRejectedValue(makeRetryError(500));

        await expect(
            transport.request('https://example.com'),
        ).rejects.toThrow(APIError);
    });

    it('statusCode 403 → AuthenticationError', async () => {
        vi.mocked(lib_request).mockRejectedValue(makeRetryError(403));

        await expect(
            transport.request('https://example.com'),
        ).rejects.toThrow(AuthenticationError);
    });

    it('statusCode 400 → ValidationError', async () => {
        vi.mocked(lib_request).mockRejectedValue(makeRetryError(400));

        await expect(
            transport.request('https://example.com'),
        ).rejects.toThrow(ValidationError);
    });

    it('stream: statusCode 429 → APIError', async () => {
        vi.mocked(lib_stream).mockRejectedValue(makeRetryError(429));

        await expect(
            transport.stream('https://example.com', { method: 'GET' }, vi.fn()),
        ).rejects.toThrow(APIError);
    });

    it('stream: statusCode 403 → AuthenticationError', async () => {
        vi.mocked(lib_stream).mockRejectedValue(makeRetryError(403));

        await expect(
            transport.stream('https://example.com', { method: 'GET' }, vi.fn()),
        ).rejects.toThrow(AuthenticationError);
    });
});

describe('retry interceptor configuration', () => {
    it('retry interceptor receives correct options', () => {
        const transport = new Transport({ apiKey: API_KEY });
        const retryCall = vi.mocked(interceptors.retry).mock.calls[0]![0] as Record<string, unknown>;

        expect(retryCall).toMatchObject({
            maxRetries: 3,
            timeoutFactor: 1.5,
            statusCodes: [429, 500, 502, 503, 504],
        });
        expect(retryCall.methods).toBeDefined();
        expect(retryCall.errorCodes).toBeDefined();

        void transport.close();
    });

    it('POST is in retry methods', () => {
        const transport = new Transport({ apiKey: API_KEY });
        const retryCall = vi.mocked(interceptors.retry).mock.calls[0]![0] as Record<string, unknown>;
        const methods = retryCall.methods as string[];

        expect(methods).toContain('POST');
        expect(methods).toContain('GET');

        void transport.close();
    });

    it('UND_ERR_CONNECT_TIMEOUT is in retry error codes', () => {
        const transport = new Transport({ apiKey: API_KEY });
        const retryCall = vi.mocked(interceptors.retry).mock.calls[0]![0] as Record<string, unknown>;
        const errorCodes = retryCall.errorCodes as string[];

        expect(errorCodes).toContain('UND_ERR_CONNECT_TIMEOUT');
        expect(errorCodes).toContain('ECONNREFUSED');
        expect(errorCodes).toContain('ECONNRESET');
        expect(errorCodes).toContain('ENOTFOUND');

        void transport.close();
    });
});
