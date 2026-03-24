import fs from 'node:fs/promises';
import { afterEach, describe, expect, test } from 'vitest';
import { BaseResult, ScrapeResult, SearchResult } from '../src/models/result';

describe('BaseResult', () => {
    test('sets defaults for optional fields', () => {
        const result = new BaseResult({ success: true });
        expect(result.data).toBeNull();
        expect(result.error).toBeNull();
        expect(result.cost).toBeNull();
        expect(result.triggerSentAt).toBeNull();
        expect(result.dataFetchedAt).toBeNull();
    });

    test('elapsedMs returns millisecond difference', () => {
        const t1 = new Date('2024-01-01T00:00:00Z');
        const t2 = new Date('2024-01-01T00:00:12.345Z');
        const result = new BaseResult({
            success: true,
            triggerSentAt: t1,
            dataFetchedAt: t2,
        });
        expect(result.elapsedMs()).toBe(12345);
    });

    test('elapsedMs returns null when timestamps missing', () => {
        const result = new BaseResult({ success: true });
        expect(result.elapsedMs()).toBeNull();
    });

    test('toJSON serializes dates to ISO strings', () => {
        const t1 = new Date('2024-01-01T00:00:00Z');
        const result = new BaseResult({
            success: true,
            data: [1, 2, 3],
            triggerSentAt: t1,
        });
        const json = result.toJSON();
        expect(json.triggerSentAt).toBe('2024-01-01T00:00:00.000Z');
        expect(json.data).toEqual([1, 2, 3]);
    });

    test('JSON.stringify uses toJSON automatically', () => {
        const result = new BaseResult({ success: true, data: 'hello' });
        const str = JSON.stringify(result);
        const parsed = JSON.parse(str);
        expect(parsed.success).toBe(true);
        expect(parsed.data).toBe('hello');
    });

    test('toDict is alias for toJSON', () => {
        const result = new BaseResult({
            success: true,
            data: [1],
        });
        expect(result.toDict()).toEqual(result.toJSON());
    });

    test('getTimingBreakdown returns timing info', () => {
        const t1 = new Date('2024-01-01T00:00:00Z');
        const t2 = new Date('2024-01-01T00:00:05Z');
        const result = new BaseResult({
            success: true,
            triggerSentAt: t1,
            dataFetchedAt: t2,
        });
        const breakdown = result.getTimingBreakdown();
        expect(breakdown.totalElapsedMs).toBe(5000);
        expect(breakdown.triggerSentAt).toBe('2024-01-01T00:00:00.000Z');
        expect(breakdown.dataFetchedAt).toBe('2024-01-01T00:00:05.000Z');
    });

    test('toString includes class name and status', () => {
        const result = new BaseResult({
            success: true,
            cost: 0.005,
            triggerSentAt: new Date('2024-01-01T00:00:00Z'),
            dataFetchedAt: new Date('2024-01-01T00:00:10Z'),
        });
        const str = result.toString();
        expect(str).toContain('BaseResult');
        expect(str).toContain('success');
        expect(str).toContain('$0.0050');
        expect(str).toContain('10000ms');
    });
});

describe('ScrapeResult', () => {
    test('includes scrape-specific fields', () => {
        const result = new ScrapeResult({
            success: true,
            data: [{ title: 'Product' }],
            snapshotId: 'snap_123',
            platform: 'amazon',
            status: 'ready',
            rowCount: 1,
        });
        expect(result.snapshotId).toBe('snap_123');
        expect(result.platform).toBe('amazon');
        const json = result.toJSON();
        expect(json.snapshotId).toBe('snap_123');
        expect(json.rowCount).toBe(1);
    });

    test('sets defaults for optional fields', () => {
        const result = new ScrapeResult({ success: true });
        expect(result.url).toBe('');
        expect(result.status).toBe('ready');
        expect(result.snapshotId).toBeNull();
        expect(result.platform).toBeNull();
        expect(result.method).toBeNull();
        expect(result.rowCount).toBeNull();
    });

    test('toString includes platform and url', () => {
        const result = new ScrapeResult({
            success: true,
            cost: 0.005,
            platform: 'amazon',
            triggerSentAt: new Date('2024-01-01T00:00:00Z'),
            dataFetchedAt: new Date('2024-01-01T00:00:10Z'),
        });
        const str = result.toString();
        expect(str).toContain('ScrapeResult');
        expect(str).toContain('success');
        expect(str).toContain('$0.0050');
        expect(str).toContain('amazon');
    });

    test('error case', () => {
        const result = new ScrapeResult({
            success: false,
            error: 'Trigger failed: 403 Forbidden',
            status: 'error',
            platform: 'amazon',
        });
        expect(result.success).toBe(false);
        expect(result.data).toBeNull();
        expect(result.error).toBe('Trigger failed: 403 Forbidden');
        expect(result.status).toBe('error');
    });

    const tmpFile = '/tmp/brd_test_result_' + Date.now() + '.json';
    afterEach(async () => {
        try {
            await fs.unlink(tmpFile);
        } catch {
            // ignore
        }
    });

    test('save writes JSON to file', async () => {
        const result = new ScrapeResult({
            success: true,
            data: [{ id: 1 }],
            platform: 'amazon',
        });
        const filepath = await result.save(tmpFile);
        expect(filepath).toContain('brd_test_result_');
        const content = JSON.parse(await fs.readFile(filepath, 'utf8'));
        expect(content.success).toBe(true);
        expect(content.platform).toBe('amazon');
    });
});

describe('SearchResult', () => {
    test('includes search-specific fields', () => {
        const result = new SearchResult({
            success: true,
            query: 'pizza restaurants',
            searchEngine: 'google',
            totalFound: 1420000,
        });
        expect(result.query).toBe('pizza restaurants');
        expect(result.searchEngine).toBe('google');
        expect(result.totalFound).toBe(1420000);
    });

    test('sets defaults for optional fields', () => {
        const result = new SearchResult({ success: true });
        expect(result.query).toBe('');
        expect(result.searchEngine).toBeNull();
        expect(result.totalFound).toBeNull();
        expect(result.country).toBeNull();
        expect(result.page).toBeNull();
    });

    test('toJSON includes search fields', () => {
        const result = new SearchResult({
            success: true,
            query: 'test',
            searchEngine: 'bing',
            page: 2,
        });
        const json = result.toJSON();
        expect(json.query).toBe('test');
        expect(json.searchEngine).toBe('bing');
        expect(json.page).toBe(2);
    });

    test('toString includes query and engine', () => {
        const result = new SearchResult({
            success: true,
            query: 'pizza',
            searchEngine: 'google',
        });
        const str = result.toString();
        expect(str).toContain('SearchResult');
        expect(str).toContain('pizza');
        expect(str).toContain('google');
    });
});
