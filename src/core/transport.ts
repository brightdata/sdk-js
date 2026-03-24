import {
    type Dispatcher,
    Agent,
    interceptors,
    request as lib_request,
    stream as lib_stream,
} from 'undici';
import type { UrlObject } from 'node:url';
import {
    DEFAULT_TIMEOUT,
    DEFAULT_CONNECTIONS,
    DEFAULT_KEEP_ALIVE_TIMEOUT,
    DEFAULT_KEEP_ALIVE_MAX_TIMEOUT,
    MAX_RETRIES,
    RETRY_BACKOFF_FACTOR,
    RETRY_STATUSES,
} from '../utils/constants';
import {
    APIError,
    AuthenticationError,
    BRDError,
    NetworkError,
    NetworkTimeoutError,
    ValidationError,
} from '../utils/errors';
import { getAuthHeaders } from '../utils/auth';
import { getLogger, logRequest } from '../utils/logger';
import { RateLimiter } from './rate-limiter';

const { dns, retry } = interceptors;

const TIMEOUT_ERROR_NAMES = new Set([
    'HeadersTimeoutError',
    'BodyTimeoutError',
    'ConnectTimeoutError',
]);

export interface TransportOptions {
    apiKey: string;
    timeout?: number;
    connections?: number;
    rateLimit?: number;
    ratePeriod?: number;
}

export interface TransportRequestOptions {
    method?: Dispatcher.HttpMethod;
    headers?: Record<string, string>;
    body?: string;
    query?: Record<string, unknown>;
    timeout?: number;
}

export interface TransportStreamOptions {
    method?: Dispatcher.HttpMethod;
    headers?: Record<string, string>;
    body?: string;
    query?: Record<string, unknown>;
    opaque?: unknown;
}

export class Transport {
    private agent: Dispatcher;
    private authHeaders: Record<string, string>;
    private defaultTimeout: number;
    private rateLimiter: RateLimiter | null;
    private closed = false;
    private logger = getLogger('transport');

    private onBeforeExit = () => {
        if (!this.closed) {
            console.warn(
                '[brightdata-sdk] Transport was not closed. ' +
                    'Call client.close() or use "await using client = new bdclient()" ' +
                    'to avoid keeping the process alive.',
            );
        }
    };

    constructor(opts: TransportOptions) {
        this.authHeaders = getAuthHeaders(opts.apiKey);
        this.defaultTimeout = opts.timeout ?? DEFAULT_TIMEOUT;
        this.rateLimiter =
            opts.rateLimit && opts.rateLimit > 0
                ? new RateLimiter(opts.rateLimit, opts.ratePeriod ?? 1000)
                : null;
        this.agent = new Agent({
            connections: opts.connections ?? DEFAULT_CONNECTIONS,
            keepAliveTimeout: DEFAULT_KEEP_ALIVE_TIMEOUT,
            keepAliveMaxTimeout: DEFAULT_KEEP_ALIVE_MAX_TIMEOUT,
            headersTimeout: this.defaultTimeout,
            bodyTimeout: this.defaultTimeout,
        }).compose(
            dns(),
            retry({
                maxRetries: MAX_RETRIES,
                timeoutFactor: RETRY_BACKOFF_FACTOR,
                statusCodes: RETRY_STATUSES,
            }),
        );
        process.on('beforeExit', this.onBeforeExit);
    }

    get headers(): Record<string, string> {
        return { ...this.authHeaders };
    }

    async request(
        url: string | URL | UrlObject,
        opts: TransportRequestOptions = {},
    ): Promise<Dispatcher.ResponseData> {
        if (this.closed) {
            throw new BRDError(
                'Transport is closed — cannot make requests after close() has been called',
            );
        }
        const { timeout, ...restOpts } = opts;
        const mergedHeaders = { ...this.authHeaders, ...opts.headers };

        const requestOpts: Record<string, unknown> = {
            ...restOpts,
            headers: mergedHeaders,
            dispatcher: this.agent,
        };

        if (timeout) {
            requestOpts.headersTimeout = timeout;
            requestOpts.bodyTimeout = timeout;
            requestOpts.signal = AbortSignal.timeout(timeout * 2);
        }

        if (this.rateLimiter) {
            await this.rateLimiter.acquire();
        }

        this.log(opts.method, url, opts.query, opts.body);

        const method = opts.method || 'GET';
        const urlStr = typeof url === 'string' ? url : JSON.stringify(url);
        const start = Date.now();
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const response = await lib_request(url, requestOpts as any);
            const durationMs = Date.now() - start;
            this.logger.debug(
                `${method} ${urlStr} → ${response.statusCode} (${durationMs}ms)`,
                {
                    method,
                    url: urlStr,
                    statusCode: response.statusCode,
                    durationMs,
                },
            );
            return response;
        } catch (e: unknown) {
            const durationMs = Date.now() - start;
            this.logger.debug(
                `${method} ${urlStr} → ERROR (${durationMs}ms): ${(e as Error).message}`,
                {
                    method,
                    url: urlStr,
                    durationMs,
                    error: (e as Error).message,
                },
            );
            if (e instanceof BRDError) throw e;
            const err = e as Error;
            if (TIMEOUT_ERROR_NAMES.has(err.name)) {
                throw new NetworkTimeoutError(
                    `Request timed out: ${err.message}`,
                    {
                        cause: err,
                    },
                );
            }
            throw new NetworkError(`Network error: ${err.message}`, {
                cause: err,
            });
        }
    }

    async stream(
        url: string | URL | UrlObject,
        opts: TransportStreamOptions,
        factory: Dispatcher.StreamFactory,
    ): Promise<Dispatcher.StreamData> {
        if (this.closed) {
            throw new BRDError(
                'Transport is closed — cannot make requests after close() has been called',
            );
        }
        const mergedHeaders = { ...this.authHeaders, ...opts.headers };

        if (this.rateLimiter) {
            await this.rateLimiter.acquire();
        }

        this.log(opts.method, url, opts.query, opts.body);

        const method = opts.method || 'GET';
        const urlStr = typeof url === 'string' ? url : JSON.stringify(url);
        const start = Date.now();
        try {
            /* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
            const result = await lib_stream(
                url,
                {
                    ...opts,
                    headers: mergedHeaders,
                    dispatcher: this.agent,
                } as any,
                factory as any,
            );
            /* eslint-enable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
            const durationMs = Date.now() - start;
            this.logger.debug(
                `STREAM ${method} ${urlStr} → OK (${durationMs}ms)`,
                { method, url: urlStr, durationMs },
            );
            return result;
        } catch (e: unknown) {
            const durationMs = Date.now() - start;
            this.logger.debug(
                `STREAM ${method} ${urlStr} → ERROR (${durationMs}ms): ${(e as Error).message}`,
                {
                    method,
                    url: urlStr,
                    durationMs,
                    error: (e as Error).message,
                },
            );
            if (e instanceof BRDError) throw e;
            const err = e as Error;
            if (TIMEOUT_ERROR_NAMES.has(err.name)) {
                throw new NetworkTimeoutError(
                    `Request timed out: ${err.message}`,
                    {
                        cause: err,
                    },
                );
            }
            throw new NetworkError(`Network error: ${err.message}`, {
                cause: err,
            });
        }
    }

    async close(): Promise<void> {
        if (this.closed) return;
        this.closed = true;
        process.removeListener('beforeExit', this.onBeforeExit);
        this.rateLimiter?.destroy();
        await (this.agent as Agent).close();
    }

    private log(
        method = 'GET',
        url: string | URL | UrlObject,
        query?: Record<string, unknown>,
        body?: unknown,
    ) {
        let meta = '';

        if (query) {
            meta += ` query=${JSON.stringify(query)}`;
        }

        if (typeof body === 'string') {
            if (meta) meta += ' ';
            meta += `body=${body}`;
        }

        logRequest(method, JSON.stringify(url), meta);
    }
}

export function throwInvalidStatus(status: number, responseTxt: string): never {
    if (status === 401 || status === 403) {
        throw new AuthenticationError(
            'invalid API key or insufficient permissions',
        );
    }

    if (status === 400) {
        throw new ValidationError(`bad request: ${responseTxt}`);
    }

    throw new APIError(`request failed`, status, responseTxt);
}

export async function assertResponse(
    response: Dispatcher.ResponseData,
    parse?: true,
): Promise<string>;
export async function assertResponse(
    response: Dispatcher.ResponseData,
    parse: false,
): Promise<Dispatcher.ResponseData['body']>;
export async function assertResponse(
    response: Dispatcher.ResponseData,
    parse = true,
): Promise<string | Dispatcher.ResponseData['body']> {
    if (response.statusCode < 400) {
        return parse ? await response.body.text() : response.body;
    }

    throwInvalidStatus(response.statusCode, await response.body.text());
}
