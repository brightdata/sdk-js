import { describe, test, expect } from 'vitest';

describe('subpath exports', () => {
    test('@brightdata/sdk exports core symbols', async () => {
        const sdk = await import('../src/index');
        expect(sdk.bdclient).toBeDefined();
        expect(sdk.BRDError).toBeDefined();
        expect(sdk.Deadline).toBeDefined();
        expect(sdk.BaseResult).toBeDefined();
        // Backward compat: subpath symbols also available from root
        expect(sdk.ScrapeRouter).toBeDefined();
        expect(sdk.ScrapeJob).toBeDefined();
        expect(sdk.SearchRouter).toBeDefined();
        expect(sdk.ScrapeResult).toBeDefined();
        expect(sdk.SearchResult).toBeDefined();
        // Datasets symbols from root
        expect(sdk.DatasetsClient).toBeDefined();
        expect(sdk.BaseDataset).toBeDefined();
    });

    test('@brightdata/sdk/scrapers exports scraper symbols', async () => {
        const scrapers = await import('../src/scrapers');
        expect(scrapers.ScrapeRouter).toBeDefined();
        expect(scrapers.ScrapeJob).toBeDefined();
        expect(scrapers.ScrapeResult).toBeDefined();
    });

    test('@brightdata/sdk/search exports search symbols', async () => {
        const search = await import('../src/search');
        expect(search.SearchRouter).toBeDefined();
        expect(search.SearchResult).toBeDefined();
    });

    test('@brightdata/sdk/datasets exports dataset symbols', async () => {
        const datasets = await import('../src/datasets');
        expect(datasets).toBeDefined();
        expect(datasets.DatasetsClient).toBeDefined();
        expect(datasets.BaseDataset).toBeDefined();
    });

    test('scraper symbols from root and subpath are identical', async () => {
        const sdk = await import('../src/index');
        const scrapers = await import('../src/scrapers');
        expect(sdk.ScrapeRouter).toBe(scrapers.ScrapeRouter);
        expect(sdk.ScrapeJob).toBe(scrapers.ScrapeJob);
        expect(sdk.ScrapeResult).toBe(scrapers.ScrapeResult);
    });

    test('search symbols from root and subpath are identical', async () => {
        const sdk = await import('../src/index');
        const search = await import('../src/search');
        expect(sdk.SearchRouter).toBe(search.SearchRouter);
        expect(sdk.SearchResult).toBe(search.SearchResult);
    });

    test('dataset symbols from root and subpath are identical', async () => {
        const sdk = await import('../src/index');
        const datasets = await import('../src/datasets');
        expect(sdk.DatasetsClient).toBe(datasets.DatasetsClient);
        expect(sdk.BaseDataset).toBe(datasets.BaseDataset);
    });
});
