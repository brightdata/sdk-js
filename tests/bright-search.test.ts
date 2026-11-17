import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    bdclient,
    BrightSearchPage,
    BrightSearchService,
    BusinessSearchService,
    EcommerceSearchService,
} from '../src/index';
import { Transport } from '../src/core/transport';
import { ZonesAPI } from '../src/api/zones';
import {
    APIError,
    AuthenticationError,
    BRDError,
    NetworkError,
    NetworkTimeoutError,
    ValidationError,
} from '../src/utils/errors';

function envelope() {
    return {
        req_id: 'request_123',
        source: 'linkedin_company',
        meta: {
            matched: 42,
            coverage_percent: 80,
            offset: 0,
            limit: 10,
            future: true,
        },
        documents: [
            {
                bright_id: 'first',
                data: { name: 'Example', nullable: null },
                future: 0,
            },
            { bright_id: 'second', data: {} },
        ],
        __explain__: { planner: { future: false } },
        future: { nested: [] },
    };
}

function response(data: unknown = envelope(), statusCode = 200, raw?: string) {
    return {
        statusCode,
        headers: {
            'Retry-After': '2',
            'X-Debug-Trace': 'trace',
            'x-debug-trace-page': 'page',
            'set-cookie': 'private',
        },
        body: {
            arrayBuffer: vi.fn(
                async () =>
                    new TextEncoder().encode(raw ?? JSON.stringify(data))
                        .buffer,
            ),
            destroy: vi.fn(),
        },
    };
}

describe('Bright Search contracts', () => {
    let request: ReturnType<typeof vi.fn>;
    let service: BrightSearchService;
    let call: (
        category: unknown,
        query: unknown,
        options: unknown,
    ) => Promise<BrightSearchPage>;
    beforeEach(() => {
        request = vi.fn().mockResolvedValue(response());
        service = new BrightSearchService({ request } as unknown as Transport);
        call = service.search.bind(service) as typeof call;
    });
    afterEach(() => vi.restoreAllMocks());

    it.each([
        ['company', 'ludicrous'],
        ['company', 'instant'],
        ['company', 'smart'],
        ['people', 'ludicrous'],
        ['people', 'instant'],
        ['people', 'smart'],
        ['ecom', 'ludicrous'],
    ])(
        'sends one native %s/%s POST with server-owned defaults',
        async (category, mode) => {
            const query =
                mode === 'ludicrous'
                    ? { equals: { future: 'exact' } }
                    : 'a query';
            const page = await call(category, query, { mode });
            expect(request).toHaveBeenCalledExactlyOnceWith(
                `https://api.brightdata.com/search/${category === 'ecom' ? 'ecommerce' : category}`,
                {
                    method: 'POST',
                    body: JSON.stringify({ mode, query, offset: 0, limit: 10 }),
                    singleAttempt: true,
                    timeout: undefined,
                },
            );
            expect(page).toBeInstanceOf(BrightSearchPage);
            expect(page.toJSON()).toEqual(envelope());
        },
    );

    it('preserves native nested keys and explicit diagnostic null/false/zero', async () => {
        const query = JSON.parse(
            '{"__proto__":{"safe":true},"and":[{"equals":{"future":false}},{"range":{"price":{">=":0}}}],"toJSON":"literal"}',
        );
        const before = JSON.stringify(query);
        await call('company', query, {
            mode: 'ludicrous',
            source: 'future_source',
            view: { fields: ['future', 'name'] },
            offset: 2,
            limit: 3,
            timeout: 25,
            debug: {
                explain: false,
                trace: 0,
                benchmark: null,
                __overrides__: { nested: { absent: null, zero: 0 } },
            },
        });
        const payload = JSON.parse(request.mock.calls[0][1].body);
        expect(payload).toEqual({
            mode: 'ludicrous',
            query,
            source: 'future_source',
            view: { fields: ['future', 'name'] },
            offset: 2,
            limit: 3,
            explain: false,
            trace: 0,
            benchmark: null,
            __overrides__: { nested: { absent: null, zero: 0 } },
        });
        expect(payload.query).toHaveProperty('__proto__', { safe: true });
        expect(JSON.stringify(query)).toBe(before);
        expect(request.mock.calls[0][1].timeout).toBe(25);
        expect(payload).not.toHaveProperty('timeout');
        expect(payload).not.toHaveProperty('debug');
    });

    it('accepts repeated acyclic objects and null-prototype JSON objects', async () => {
        const shared = Object.assign(Object.create(null), { x: 1 });
        await call('company', { a: shared, b: shared }, { mode: 'ludicrous' });
        expect(JSON.parse(request.mock.calls[0][1].body).query).toEqual({
            a: { x: 1 },
            b: { x: 1 },
        });
    });

    it.each(['', 'x'.repeat(201), '😀'.repeat(150)])(
        'forwards strings without guessing a character-count rule',
        async (query) => {
            await call('people', query, { mode: 'instant', limit: 0 });
            expect(JSON.parse(request.mock.calls[0][1].body).query).toBe(query);
        },
    );
    it('forwards unspecified zero limits, empty structured queries and future views/sources', async () => {
        await call(
            'ecom',
            {},
            { mode: 'ludicrous', source: 'future', view: 'summary', limit: 0 },
        );
        expect(request).toHaveBeenCalledOnce();
    });

    it.each([
        ['instant', 99, 1],
        ['instant', 0, 100],
        ['smart', 90, 10],
        ['smart', 100, 0],
        ['ludicrous', 1000, 100],
    ])(
        'accepts the current %s paging boundary offset=%s limit=%s',
        async (mode, offset, limit) => {
            await call('company', mode === 'ludicrous' ? {} : 'q', {
                mode,
                offset,
                limit,
            });
            expect(request).toHaveBeenCalledOnce();
        },
    );
    it.each([
        ['instant', 90, 11],
        ['smart', 91, 10],
        ['instant', 100, 1],
        ['instant', 101, 0],
    ])(
        'rejects the current %s window overflow offset=%s limit=%s before dispatch',
        async (mode, offset, limit) => {
            await expect(
                call('company', 'q', { mode, offset, limit }),
            ).rejects.toBeInstanceOf(ValidationError);
            expect(request).not.toHaveBeenCalled();
        },
    );

    it.each([
        ['flights', {}, { mode: 'ludicrous' }],
        ['../company', {}, { mode: 'ludicrous' }],
        ['company', 'query', undefined],
        ['company', 'query', {}],
        ['company', 'query', { mode: 'ludicrous' }],
        ['people', {}, { mode: 'instant' }],
        ['company', [], { mode: 'ludicrous' }],
        ['company', null, { mode: 'ludicrous' }],
        ['ecom', {}, { mode: 'smart' }],
        ['ecom', 'query', { mode: 'instant' }],
        ['company', 'query', { mode: 'unknown' }],
        ...[-1, 1.2, true, '1', Infinity, 1001].map((offset) => [
            'company',
            'query',
            { mode: 'instant', offset },
        ]),
        ...[-1, 1.5, true, '2', NaN, 101].map((limit) => [
            'company',
            'query',
            { mode: 'instant', limit },
        ]),
        ['company', 'query', { mode: 'smart', offset: 101 }],
        ['people', 'query', { mode: 'smart', limit: 11 }],
        ['company', 'query', { mode: 'instant', source: 3 }],
        [
            'company',
            'query',
            { mode: 'instant', view: { fields: ['name'], extra: true } },
        ],
        ['company', 'query', { mode: 'instant', view: { fields: [1] } }],
        ['company', 'query', { mode: 'instant', timeout: 0 }],
        ['company', 'query', { mode: 'instant', timeout: Infinity }],
        ['company', 'query', { mode: 'instant', zone: 'old-serp' }],
        ['company', 'query', { mode: 'instant', debug: { mode: 'smart' } }],
        ['company', 'query', { mode: 'instant', debug: { query: {} } }],
        ['company', 'query', { mode: 'instant', debug: { trace: undefined } }],
        ['company', 'query', { mode: 'instant', debug: null }],
        ['ecom', {}, { mode: 'ludicrous', view: 'summary' }],
        [
            'ecom',
            {},
            {
                mode: 'ludicrous',
                source: 'retail_products_live',
                view: 'summary',
            },
        ],
    ])(
        'rejects invalid outer request %# before dispatch',
        async (category, query, options) => {
            await expect(call(category, query, options)).rejects.toBeInstanceOf(
                ValidationError,
            );
            expect(request).not.toHaveBeenCalled();
        },
    );

    const invalidJSON = [
        undefined,
        () => {},
        Symbol('x'),
        1n,
        NaN,
        Infinity,
        -Infinity,
        new Date(),
        new Map(),
        new Set(),
        /x/,
        new (class Custom {
            x = 1;
        })(),
        [undefined],
        new Array(1),
        Object.assign([], { extra: 1 }),
        Object.defineProperty({}, 'hidden', { value: 1 }),
        { [Symbol('hidden')]: 1 },
        { toJSON: () => 'rewritten' },
    ];
    it.each(invalidJSON.map((value, index) => [index, value]))(
        'rejects non-JSON nested value %s',
        async (_index, value) => {
            await expect(
                call('company', { x: value }, { mode: 'ludicrous' }),
            ).rejects.toBeInstanceOf(ValidationError);
            await expect(
                call('company', 'q', {
                    mode: 'instant',
                    debug: { __overrides__: { x: value } },
                }),
            ).rejects.toBeInstanceOf(ValidationError);
            expect(request).not.toHaveBeenCalled();
        },
    );
    it('rejects a cycle and does not execute getters', async () => {
        const cycle: Record<string, unknown> = {};
        cycle.self = cycle;
        const getter = vi.fn(() => 1);
        const accessor = Object.defineProperty({}, 'x', {
            get: getter,
            enumerable: true,
        });
        await expect(
            call('company', cycle, { mode: 'ludicrous' }),
        ).rejects.toBeInstanceOf(ValidationError);
        await expect(
            call('company', accessor, { mode: 'ludicrous' }),
        ).rejects.toBeInstanceOf(ValidationError);
        expect(getter).not.toHaveBeenCalled();
        expect(request).not.toHaveBeenCalled();
    });
    it('normalizes serialization depth failures before dispatch', async () => {
        const query: Record<string, unknown> = {};
        let next = query;
        for (let i = 0; i < 15_000; i++) next = next.child = {};
        await expect(
            call('company', query, { mode: 'ludicrous' }),
        ).rejects.toBeInstanceOf(ValidationError);
        expect(request).not.toHaveBeenCalled();
    });

    it('keeps sparse records, order, unknown keys and accessor/serialization identity', () => {
        const raw = envelope();
        Object.defineProperty(raw, '__proto__', {
            value: { literal: 1 },
            enumerable: true,
        });
        const page = new BrightSearchPage(raw, { 'x-debug-trace': 'trace' });
        expect(page.raw).toBe(raw);
        expect(page.toJSON()).toBe(raw);
        expect(page.documents.map((d) => d.bright_id)).toEqual([
            'first',
            'second',
        ]);
        expect(page.documents[1].data).toEqual({});
        expect(page.explain).toBe(raw.__explain__);
        expect(JSON.parse(JSON.stringify(page))).toEqual(raw);
        expect(page.toJSON()).not.toHaveProperty('responseHeaders');
        raw.req_id = 'changed';
        expect(page.reqId).toBe('changed');
        expect(page.meta).toBe(raw.meta);
    });
    it('allows an empty page', () => {
        const raw = { ...envelope(), documents: [] };
        expect(new BrightSearchPage(raw).documents).toEqual([]);
    });

    it.each([
        null,
        [],
        {},
        { ...envelope(), req_id: 1 },
        { ...envelope(), source: null },
        { ...envelope(), documents: {} },
        { ...envelope(), documents: [{ bright_id: 1, data: {} }] },
        { ...envelope(), documents: [{ bright_id: 'id', data: [] }] },
        { ...envelope(), documents: [{ bright_id: 'id', data: null }] },
        {
            ...envelope(),
            meta: { matched: 1, coverage_percent: true, offset: 0, limit: 10 },
        },
        {
            ...envelope(),
            meta: { matched: 1, coverage_percent: 50, offset: 0.5, limit: 10 },
        },
    ])('classifies malformed envelope %# as an API failure', async (data) => {
        request.mockResolvedValue(response(data));
        const error = await call('company', 'q', { mode: 'instant' }).catch(
            (e) => e,
        );
        expect(error).toBeInstanceOf(APIError);
        expect(error.context.statusCode).toBe(200);
        expect(error.context.responseJson).toEqual(data);
    });
    it.each([NaN, Infinity, -Infinity])(
        'rejects nonfinite metadata in directly constructed pages',
        (value) => {
            const raw = envelope();
            raw.meta.matched = value;
            expect(() => new BrightSearchPage(raw)).toThrow(ValidationError);
        },
    );

    it.each([
        [400, ValidationError],
        [401, AuthenticationError],
        [403, AuthenticationError],
        [429, APIError],
        [500, APIError],
        [502, APIError],
        [202, APIError],
        [302, APIError],
    ])(
        'retains HTTP %s error identity and diagnostics',
        async (status, ErrorType) => {
            const data = {
                __explain__: 'x'.repeat(6000),
                req_id: 'tail-id',
                error: 'failed',
            };
            request.mockResolvedValue(response(data, status as number));
            const error = await call('company', 'q', { mode: 'instant' }).catch(
                (e) => e,
            );
            expect(error).toBeInstanceOf(ErrorType as typeof Error);
            expect(error.context).toEqual({
                statusCode: status,
                reqId: 'tail-id',
                responseJson: data,
                responseText: JSON.stringify(data),
                url: 'https://api.brightdata.com/search/company',
                method: 'POST',
                responseHeaders: {
                    'retry-after': '2',
                    'x-debug-trace': 'trace',
                    'x-debug-trace-page': 'page',
                },
            });
            expect(error.message.length).toBeLessThan(650);
            expect(error.toJSON().context).toBe(error.context);
            expect(request).toHaveBeenCalledOnce();
        },
    );

    it.each([
        [200, APIError],
        [400, ValidationError],
        [429, APIError],
    ])(
        'preserves HTTP %s classification for non-JSON bodies',
        async (status, ErrorType) => {
            request.mockResolvedValue(
                response(null, status as number, '<html>failed</html>'),
            );
            const error = await call('company', 'q', { mode: 'instant' }).catch(
                (e) => e,
            );
            expect(error).toBeInstanceOf(ErrorType as typeof Error);
            expect(error.context.responseText).toBe('<html>failed</html>');
            expect(error.context).not.toHaveProperty('responseJson');
            expect(error.context).not.toHaveProperty('reqId');
            expect(error.cause).toBeInstanceOf(SyntaxError);
        },
    );

    it.each([
        [200, NetworkTimeoutError],
        [400, ValidationError],
        [401, AuthenticationError],
        [429, APIError],
        [502, APIError],
    ])(
        'retains known context on HTTP %s body timeouts',
        async (status, ErrorType) => {
            const res = response(null, status as number);
            const cause = Object.assign(new Error('body timeout'), {
                name: 'BodyTimeoutError',
            });
            res.body.arrayBuffer.mockRejectedValue(cause);
            request.mockResolvedValue(res);
            const error = await call('company', 'q', { mode: 'instant' }).catch(
                (e) => e,
            );
            expect(error).toBeInstanceOf(ErrorType as typeof Error);
            expect(error.context.statusCode).toBe(status);
            expect(error.context.responseHeaders['retry-after']).toBe('2');
            expect(error.context).not.toHaveProperty('reqId');
            expect(error.context).not.toHaveProperty('responseJson');
            expect(error.cause).toBe(cause);
            expect(res.body.destroy).toHaveBeenCalledOnce();
            expect(request).toHaveBeenCalledOnce();
        },
    );
    it('does not mutate pre-response/shared errors', async () => {
        const shared = new BRDError('rate limiter is closed');
        request.mockRejectedValue(shared);
        await expect(call('company', 'q', { mode: 'instant' })).rejects.toBe(
            shared,
        );
        expect(Object.hasOwn(shared, 'context')).toBe(false);
    });
    it('does not mutate an existing SDK error emitted by a response body', async () => {
        const shared = new NetworkError('failed');
        const res = response();
        res.body.arrayBuffer.mockRejectedValue(shared);
        request.mockResolvedValue(res);
        const error = await call('company', 'q', { mode: 'instant' }).catch(
            (e) => e,
        );
        expect(error).toBeInstanceOf(NetworkError);
        expect(error).not.toBe(shared);
        expect(error.cause).toBe(shared);
        expect(Object.hasOwn(shared, 'context')).toBe(false);
    });

    it('uses the cached client search facade without zone creation, even when enabled', async () => {
        const post = vi
            .spyOn(Transport.prototype, 'request')
            .mockResolvedValue(response() as never);
        const ensureZone = vi
            .spyOn(ZonesAPI.prototype, 'ensureZone')
            .mockRejectedValue(new Error('must not create zones'));
        const client = new bdclient({
            apiKey: 'test-key-1234567890',
            autoCreateZones: true,
        });
        try {
            expect(client.search).toBe(client.search);
            expect(client.search.business).toBe(client.search.business);
            expect(client.search.ecommerce).toBe(client.search.ecommerce);
            expect(client.search.business).toBeInstanceOf(
                BusinessSearchService,
            );
            expect(client.search.ecommerce).toBeInstanceOf(
                EcommerceSearchService,
            );
            for (const oldName of ['company', 'people', 'ecom']) {
                expect(client.search).not.toHaveProperty(oldName);
            }
            const search = vi.spyOn(BrightSearchService.prototype, 'search');
            await client.search.business.companies('q', { mode: 'instant' });
            await client.search.business.people({}, { mode: 'ludicrous' });
            await client.search.ecommerce.products({}, { mode: 'ludicrous' });
            expect(ensureZone).not.toHaveBeenCalled();
            expect(post).toHaveBeenCalledTimes(3);
            expect(new Set(post.mock.contexts).size).toBe(1);
            expect(new Set(search.mock.contexts).size).toBe(1);
        } finally {
            await client.close();
        }
    });

    it('routes all seven supported mode combinations through the grouped API', async () => {
        const post = vi
            .spyOn(Transport.prototype, 'request')
            .mockResolvedValue(response() as never);
        const client = new bdclient({ apiKey: 'test-key-1234567890' });
        try {
            const business = client.search.business;
            await business.companies({}, { mode: 'ludicrous' });
            await business.companies('q', { mode: 'instant' });
            await business.companies('q', { mode: 'smart' });
            await business.people({}, { mode: 'ludicrous' });
            await business.people('q', { mode: 'instant' });
            await business.people('q', { mode: 'smart' });
            await client.search.ecommerce.products({}, { mode: 'ludicrous' });
            expect(
                post.mock.calls.map(([url, opts]) => ({
                    url,
                    ...JSON.parse(opts!.body!),
                })),
            ).toEqual(
                [
                    ['company', 'ludicrous', {}],
                    ['company', 'instant', 'q'],
                    ['company', 'smart', 'q'],
                    ['people', 'ludicrous', {}],
                    ['people', 'instant', 'q'],
                    ['people', 'smart', 'q'],
                    ['ecommerce', 'ludicrous', {}],
                ].map(([category, mode, query]) => ({
                    url: `https://api.brightdata.com/search/${category}`,
                    mode,
                    query,
                    offset: 0,
                    limit: 10,
                })),
            );
        } finally {
            await client.close();
        }
    });

    it('keeps cached namespaces subject to the owning client lifecycle', async () => {
        const client = new bdclient({ apiKey: 'test-key-1234567890' });
        const { business, ecommerce } = client.search;
        await client.close();
        await expect(
            business.companies('q', { mode: 'instant' }),
        ).rejects.toThrow('Transport is closed');
        await expect(
            business.people({}, { mode: 'ludicrous' }),
        ).rejects.toThrow('Transport is closed');
        await expect(
            ecommerce.products({}, { mode: 'ludicrous' }),
        ).rejects.toThrow('Transport is closed');
    });
});
