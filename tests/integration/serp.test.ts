import 'dotenv/config';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { bdclient } from '../../src/index';

const API_KEY = process.env.BRIGHTDATA_API_TOKEN;

describe.skipIf(!API_KEY)('SERP / Search (real API)', () => {
    let client: bdclient;

    beforeAll(() => {
        client = new bdclient({
            apiKey: API_KEY,
            autoCreateZones: false,
        });
    });

    afterAll(async () => {
        await client?.close();
    });

    test('search.google returns results', async () => {
        const result = await client.search.google('bright data web scraping');
        expect(typeof result).toBe('string');
        expect((result as string).length).toBeGreaterThan(0);
    }, 30_000);

    test('search.google returns JSON when format is json', async () => {
        const result = await client.search.google('nodejs tutorial', {
            format: 'json',
        });
        expect(result).toHaveProperty('status_code');
        expect(result).toHaveProperty('body');
    }, 30_000);

    test('search.bing returns results', async () => {
        const result = await client.search.bing('bright data');
        expect(typeof result).toBe('string');
        expect((result as string).length).toBeGreaterThan(0);
    }, 30_000);

    test('search.yandex returns results', async () => {
        const result = await client.search.yandex('bright data');
        expect(typeof result).toBe('string');
        expect((result as string).length).toBeGreaterThan(0);
    }, 60_000);

    test('search.google handles batch queries', async () => {
        const queries = ['pizza restaurants', 'sushi restaurants'];
        const results = await client.search.google(queries);
        expect(Array.isArray(results)).toBe(true);
        expect(results).toHaveLength(2);
    }, 60_000);
});
