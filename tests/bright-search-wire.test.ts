import {
    createServer,
    type IncomingMessage,
    type Server,
    type ServerResponse,
} from 'node:http';
import { once } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrightSearchService } from '../src/api/brightsearch/service';
import { Transport } from '../src/core/transport';
import {
    APIError,
    AuthenticationError,
    NetworkError,
    NetworkTimeoutError,
    ValidationError,
} from '../src/utils/errors';

const body = JSON.stringify({
    req_id: 'wire-id',
    source: 'linkedin_company',
    meta: { matched: 0, coverage_percent: 100, offset: 0, limit: 10 },
    documents: [],
});

describe('Bright Search through real HTTP and Undici', () => {
    let server: Server | undefined;
    const transports: Transport[] = [];
    afterEach(async () => {
        for (const transport of transports.splice(0)) await transport.close();
        if (server) {
            server.closeAllConnections();
            await new Promise<void>((resolve, reject) =>
                server!.close((error) => (error ? reject(error) : resolve())),
            );
            server = undefined;
        }
        vi.restoreAllMocks();
    });

    async function peer(
        handle: (req: IncomingMessage, res: ServerResponse) => void,
    ) {
        const requests: {
            method?: string;
            url?: string;
            headers: IncomingMessage['headers'];
            body: string;
        }[] = [];
        const responses: ServerResponse[] = [];
        server = createServer(async (req, res) => {
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(Buffer.from(chunk));
            requests.push({
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: Buffer.concat(chunks).toString(),
            });
            responses.push(res);
            handle(req, res);
        });
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const address = server.address();
        if (!address || typeof address === 'string')
            throw new Error('missing local listener');
        const origin = `http://127.0.0.1:${address.port}`;
        const transport = new Transport({
            apiKey: 'offline-wire-test-key',
            timeout: 1000,
        });
        transports.push(transport);
        const originalRequest = transport.request.bind(transport);
        // Change only the destination, preserving real dispatch, interceptors,
        // bytes, errors and resource ownership in the component under test.
        vi.spyOn(transport, 'request').mockImplementation((url, options) =>
            originalRequest(
                `${origin}${new URL(String(url)).pathname}`,
                options,
            ),
        );
        return {
            requests,
            responses,
            transport,
            service: new BrightSearchService(transport),
        };
    }

    it('sends authenticated native JSON through the owning transport', async () => {
        const p = await peer((_req, res) => {
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'X-Debug-Trace': 'trace',
                'Set-Cookie': 'private',
            });
            res.end(body);
        });
        const page = await p.service.search('company', 'q', {
            mode: 'instant',
        });
        expect(p.requests).toHaveLength(1);
        expect(p.requests[0]).toMatchObject({
            method: 'POST',
            url: '/search/company',
        });
        expect(p.requests[0].headers.authorization).toBe(
            'Bearer offline-wire-test-key',
        );
        expect(p.requests[0].headers['user-agent']).toMatch(
            /brightdata-sdk-js/,
        );
        expect(JSON.parse(p.requests[0].body)).toEqual({
            mode: 'instant',
            query: 'q',
            offset: 0,
            limit: 10,
        });
        expect(page.reqId).toBe('wire-id');
        expect(page.responseHeaders).toEqual({ 'x-debug-trace': 'trace' });
        expect(p.transport.request).toHaveBeenCalledOnce();
    });

    it('routes the ecom facade category to the current ecommerce endpoint', async () => {
        const p = await peer((_req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(body.replace('linkedin_company', 'retail_products_live'));
        });
        const page = await p.service.search(
            'ecom',
            { range: { price: { '>=': 0 } } },
            { mode: 'ludicrous' },
        );
        expect(page.source).toBe('retail_products_live');
        expect(p.requests.map((r) => r.url)).toEqual(['/search/ecommerce']);
    });

    it.each([400, 401, 403, 429, 500, 502, 503])(
        'makes one attempt and preserves HTTP %s body and identity',
        async (status) => {
            const errorBody = JSON.stringify({
                __explain__: 'x'.repeat(6000),
                req_id: 'tail-id',
                error: 'failed',
            });
            const p = await peer((_req, res) => {
                res.writeHead(status, {
                    'Retry-After': '0',
                    'X-Debug-Trace-Page': 'trace-page',
                    'Content-Type': 'application/json',
                });
                res.end(errorBody);
            });
            const error = await p.service
                .search('company', 'q', { mode: 'instant' })
                .catch((e) => e);
            const ErrorType =
                status === 400
                    ? ValidationError
                    : [401, 403].includes(status)
                      ? AuthenticationError
                      : APIError;
            expect(error).toBeInstanceOf(ErrorType);
            expect(p.requests).toHaveLength(1);
            expect(error.context.statusCode).toBe(status);
            expect(error.context.reqId).toBe('tail-id');
            expect(error.context.responseText).toBe(errorBody);
            expect(error.context.responseHeaders).toEqual({
                'retry-after': '0',
                'x-debug-trace-page': 'trace-page',
            });
            expect(error.message.length).toBeLessThan(650);
        },
    );

    it.each([202, 204, 301, 302, 303, 307, 308])(
        'rejects status %s without following or polling',
        async (status) => {
            const p = await peer((_req, res) => {
                res.writeHead(status, { Location: '/follow-up' });
                res.end(body);
            });
            const error = await p.service
                .search('company', 'q', { mode: 'instant' })
                .catch((e) => e);
            expect(error).toBeInstanceOf(APIError);
            expect(error.context.statusCode).toBe(status);
            expect(p.requests.map((r) => r.url)).toEqual(['/search/company']);
        },
    );

    it('does not replay a reset before headers and invents no response context', async () => {
        const p = await peer((req) => req.socket.destroy());
        const error = await p.service
            .search('company', 'q', { mode: 'instant' })
            .catch((e) => e);
        expect(error).toBeInstanceOf(NetworkError);
        expect(p.requests).toHaveLength(1);
        expect(Object.hasOwn(error, 'context')).toBe(false);
    });

    it.each([200, 400, 401, 429, 502])(
        'retains classification and headers for truncated HTTP %s bodies',
        async (status) => {
            const p = await peer((_req, res) => {
                res.writeHead(status, {
                    'Content-Length': Buffer.byteLength(body) + 100,
                    Connection: 'close',
                    'Retry-After': '2',
                });
                res.end(body);
            });
            const error = await p.service
                .search('company', 'q', { mode: 'instant' })
                .catch((e) => e);
            const ErrorType =
                status === 200
                    ? NetworkError
                    : status === 400
                      ? ValidationError
                      : status === 401
                        ? AuthenticationError
                        : APIError;
            expect(error).toBeInstanceOf(ErrorType);
            expect(error.context.statusCode).toBe(status);
            expect(error.context.responseHeaders['retry-after']).toBe('2');
            expect(error.context).not.toHaveProperty('reqId');
            expect(error.context).not.toHaveProperty('responseJson');
            expect(error.cause).toBeInstanceOf(Error);
            expect(p.requests).toHaveLength(1);
        },
    );

    it.each(
        [200, 400, 401, 429, 502].flatMap((status) =>
            ['id', 'message'].map((location) => [status, location] as const),
        ),
    )(
        'rejects invalid UTF-8 in HTTP %s %s without parsing repaired JSON',
        async (status, location) => {
            const before =
                location === 'id'
                    ? '{"req_id":"bad'
                    : '{"req_id":"unchanged-id","error":"bad';
            const invalid = Buffer.concat([
                Buffer.from(before),
                Buffer.from([0xff]),
                Buffer.from('"}'),
            ]);
            const p = await peer((_req, res) => {
                res.writeHead(status, {
                    'Content-Type': 'application/json',
                    'Retry-After': '2',
                });
                res.end(invalid);
            });
            const error = await p.service
                .search('company', 'q', { mode: 'instant' })
                .catch((e) => e);
            const ErrorType =
                status === 400
                    ? ValidationError
                    : status === 401
                      ? AuthenticationError
                      : APIError;
            expect(error).toBeInstanceOf(ErrorType);
            expect(error.context.statusCode).toBe(status);
            expect(error.context.responseText).toContain('�');
            expect(error.context).not.toHaveProperty('reqId');
            expect(error.context).not.toHaveProperty('responseJson');
            expect(error.cause).toBeInstanceOf(TypeError);
            expect(p.requests).toHaveLength(1);
        },
    );

    it.each([200, 429])(
        'preserves context and closes a timed-out HTTP %s body',
        async (status) => {
            const p = await peer((_req, res) => {
                res.writeHead(status, {
                    'Content-Type': 'application/json',
                    'Retry-After': '2',
                });
                res.flushHeaders();
                res.write('{"req_id":');
            });
            const error = await p.service
                .search('company', 'q', { mode: 'instant', timeout: 50 })
                .catch((e) => e);
            expect(error).toBeInstanceOf(
                status === 200 ? NetworkTimeoutError : APIError,
            );
            expect(error.context.statusCode).toBe(status);
            expect(error.context.responseHeaders['retry-after']).toBe('2');
            expect(error.context).not.toHaveProperty('reqId');
            expect(error.cause).toBeDefined();
            expect(p.requests).toHaveLength(1);
            await vi.waitFor(() => expect(p.responses[0].destroyed).toBe(true));
        },
    );

    it('keeps default retry interception for legacy requests', async () => {
        const p = await peer((_req, res) => {
            res.writeHead(429, { 'Retry-After': '0' });
            res.end('{"error":"limited"}');
        });
        await expect(
            p.transport.request('https://api.brightdata.com/legacy', {
                method: 'POST',
                body: '{}',
            }),
        ).rejects.toBeInstanceOf(APIError);
        expect(p.requests).toHaveLength(4);
    });
});
