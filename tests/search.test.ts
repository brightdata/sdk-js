import type { Dispatcher } from 'undici';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchRouter } from '../src/api/search/router';
import { Transport } from '../src/core/transport';
import { ValidationError } from '../src/utils/errors';
import type { ZonesAPI } from '../src/api/zones';

const mockTransport = {
    request: vi.fn(),
    stream: vi.fn(),
    headers: {},
} as unknown as Transport;

const mockZonesAPI = {
    ensureZone: vi.fn(),
    listZones: vi.fn(),
} as unknown as ZonesAPI;

function mockRequest(body: string) {
    vi.mocked(mockTransport.request).mockResolvedValue({
        statusCode: 200,
        headers: {},
        body: { text: () => Promise.resolve(body) },
    } as unknown as Dispatcher.ResponseData);
}

function getRequestedUrl(): string {
    const call = vi.mocked(mockTransport.request).mock.calls[0];
    const body = JSON.parse(call[1]!.body as string) as { url: string };
    return body.url;
}

describe('SearchRouter', () => {
    let router: SearchRouter;

    beforeEach(() => {
        vi.clearAllMocks();
        router = new SearchRouter({
            transport: mockTransport,
            zonesAPI: mockZonesAPI,
            autoCreateZones: false,
            zone: 'sdk_serp',
        });
    });

    describe('Google URL construction', () => {
        it('builds google URL with query and brd_json=1', async () => {
            mockRequest('results');
            await router.google('bright data');
            const url = getRequestedUrl();
            expect(url).toContain('google.com/search');
            expect(url).toContain('q=bright%20data');
            expect(url).toContain('brd_json=1');
        });

        it('includes hl= parameter', async () => {
            mockRequest('results');
            await router.google('test', { language: 'fr' });
            expect(getRequestedUrl()).toContain('&hl=fr');
        });

        it('includes gl= with country', async () => {
            mockRequest('results');
            await router.google('test', { country: 'us' });
            expect(getRequestedUrl()).toContain('&gl=us');
        });

        it('includes start= parameter', async () => {
            mockRequest('results');
            await router.google('test', { start: 20 });
            expect(getRequestedUrl()).toContain('&start=20');
        });
    });

    describe('Bing URL construction', () => {
        it('builds bing URL with count=', async () => {
            mockRequest('results');
            await router.bing('bright data');
            const url = getRequestedUrl();
            expect(url).toContain('bing.com/search');
            expect(url).toContain('q=bright%20data');
            expect(url).toContain('count=');
        });

        it('numResults maps to count=', async () => {
            mockRequest('results');
            await router.bing('test', { numResults: 25 });
            expect(getRequestedUrl()).toContain('count=25');
        });
    });

    describe('Yandex URL construction', () => {
        it('builds yandex URL with numdoc=', async () => {
            mockRequest('results');
            await router.yandex('bright data');
            const url = getRequestedUrl();
            expect(url).toContain('yandex.com/search');
            expect(url).toContain('text=bright%20data');
            expect(url).toContain('numdoc=');
        });
    });

    describe('engine delegation', () => {
        it('google() passes searchEngine: google', async () => {
            mockRequest('results');
            await router.google('test');
            expect(getRequestedUrl()).toContain('google.com');
        });

        it('bing() passes searchEngine: bing', async () => {
            mockRequest('results');
            await router.bing('test');
            expect(getRequestedUrl()).toContain('bing.com');
        });

        it('yandex() passes searchEngine: yandex', async () => {
            mockRequest('results');
            await router.yandex('test');
            expect(getRequestedUrl()).toContain('yandex.com');
        });
    });

    describe('validation', () => {
        it('empty query throws ValidationError', async () => {
            await expect(router.google('')).rejects.toThrow(ValidationError);
        });

        it('query exceeding 2048 chars throws ValidationError', async () => {
            const longQuery = 'a'.repeat(2049);
            await expect(router.google(longQuery)).rejects.toThrow(ValidationError);
        });
    });
});
