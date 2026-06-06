import 'dotenv/config';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { bdclient } from '../../src/index';
import { CrawlResult } from '../../src/api/crawler/result';
import { ScrapeJob } from '../../src/api/scrape/job';

const API_KEY = process.env.BRIGHTDATA_API_TOKEN;

describe.skipIf(!API_KEY)('Crawler (real API)', () => {
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

    test('crawl single URL — returns CrawlResult with one record containing url and markdown', async () => {
        const result = await client.crawler.crawl('https://example.com');

        expect(result).toBeInstanceOf(CrawlResult);
        expect(result.success).toBe(true);
        expect(result.error).toBeNull();
        expect(result.pageCount).toBe(1);
        expect(result.data).toHaveLength(1);

        const record = result.data?.[0];
        expect(record?.url).toContain('example.com');
        expect(typeof record?.markdown).toBe('string');
    }, 60_000);

    test('crawl batch — pageCount matches input length', async () => {
        const urls = ['https://example.com', 'https://example.com/about'];
        const result = await client.crawler.crawl(urls);

        expect(result.success).toBe(true);
        expect(result.pageCount).toBe(urls.length);
        expect(result.data).toHaveLength(urls.length);
    }, 120_000);

    test('trigger + status + download round-trip', async () => {
        const job = await client.crawler.trigger('https://example.com');
        expect(job).toBeInstanceOf(ScrapeJob);
        expect(job.snapshotId).toBeTruthy();
        expect(job.platform).toBe('crawler');

        const status = await client.crawler.status(job.snapshotId);
        expect(typeof status).toBe('string');

        const result = await client.crawler.download(job.snapshotId, {
            pollInterval: 5_000,
            pollTimeout: 480_000,
        });

        expect(result).toBeInstanceOf(CrawlResult);
        expect(result.success).toBe(true);
        expect(result.snapshotId).toBe(job.snapshotId);
        expect(result.pageCount).toBeGreaterThan(0);
        expect(result.data?.[0]?.url).toContain('example.com');
    }, 540_000);
});
