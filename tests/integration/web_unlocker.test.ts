import 'dotenv/config';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { bdclient } from '../../src/index';

const API_KEY = process.env.BRIGHTDATA_API_TOKEN;

describe.skipIf(!API_KEY)('Web Unlocker (real API)', () => {
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

    test('scrapeUrl returns HTML for a simple page', async () => {
        const result = await client.scrapeUrl('https://example.com');
        expect(typeof result).toBe('string');
        expect(result).toContain('Example Domain');
    }, 30_000);

    test('scrapeUrl returns JSON when format is json', async () => {
        const result = await client.scrapeUrl('https://example.com', {
            format: 'json',
        });
        expect(result).toHaveProperty('status_code');
        expect(result).toHaveProperty('body');
    }, 30_000);

    test('scrapeUrl returns markdown when dataFormat is markdown', async () => {
        const result = await client.scrapeUrl('https://example.com', {
            dataFormat: 'markdown',
        });
        expect(typeof result).toBe('string');
        expect(result).toContain('Example Domain');
    }, 30_000);

    test('scrapeUrl handles batch URLs', async () => {
        const urls = ['https://example.com', 'https://httpbin.org/html'];
        const results = await client.scrapeUrl(urls);
        expect(Array.isArray(results)).toBe(true);
        expect(results).toHaveLength(2);
    }, 60_000);
});
