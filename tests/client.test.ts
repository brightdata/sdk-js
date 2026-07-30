import type { Dispatcher } from 'undici';
import { describe, expect, test, vi } from 'vitest';
import { bdclient, ValidationError } from '../src/index';
import { Transport } from '../src/core/transport';
import { TiktokAPI } from '../src/api/scrape/tiktok';
import { YoutubeAPI } from '../src/api/scrape/youtube';
import { RedditAPI } from '../src/api/scrape/reddit';
import { DigikeyAPI } from '../src/api/scrape/digikey';
import { PerplexityAPI } from '../src/api/scrape/perplexity';
import { DatasetsClient } from '../src/api/datasets/client';
import { LinkedinProfilesDataset } from '../src/api/datasets/platforms/linkedin';

vi.spyOn(Transport.prototype, 'request').mockImplementation(() => {
    return Promise.resolve({
        statusCode: 200,
        body: {
            text: () =>
                Promise.resolve(
                    JSON.stringify({
                        data: 'mocked search result content',
                        response_format: 'raw',
                    }),
                ),
        },
    } as Dispatcher.ResponseData);
});

describe('bdclient - Simple Usage', () => {
    test('4-line scraping example should work', async () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        const result = await client.scrapeUrl('https://example.com');
        expect(result).toBe(
            '{"data":"mocked search result content","response_format":"raw"}',
        );
    });
    test('4-line search example should work', async () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        const result = await client.search.google('test query');
        expect(result).toBe(
            '{"data":"mocked search result content","response_format":"raw"}',
        );
    });
    test('should reject invalid API token', () => {
        expect(() => new bdclient({ apiKey: 'short' })).toThrow(
            ValidationError,
        );
    });
    test('should reject invalid URL', async () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        await expect(() =>
            client.scrapeUrl('invalid-url'),
        ).rejects.toThrowError(ValidationError);
    });
    test('search.bing should work', async () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        const result = await client.search.bing('test query');
        expect(result).toBeDefined();
    });
    test('search.yandex should work', async () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        const result = await client.search.yandex('test query');
        expect(result).toBeDefined();
    });
    test('accepts valid timeout', () => {
        expect(() => new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
            timeout: 30_000,
        })).not.toThrow();
    });
    test('rejects timeout below 1000ms', () => {
        expect(() => new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            timeout: 500,
        })).toThrow(ValidationError);
    });
    test('rejects timeout above 300_000ms', () => {
        expect(() => new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            timeout: 500_000,
        })).toThrow(ValidationError);
    });
    test('Symbol.asyncDispose calls close', async () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        const closeSpy = vi.spyOn(client, 'close').mockResolvedValue();
        await client[Symbol.asyncDispose]();
        expect(closeSpy).toHaveBeenCalledOnce();
    });
});

describe('bdclient - New platforms', () => {
    test('scrape.tiktok is a TiktokAPI instance', () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        expect(client.scrape.tiktok).toBeInstanceOf(TiktokAPI);
    });
    test('scrape.youtube is a YoutubeAPI instance', () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        expect(client.scrape.youtube).toBeInstanceOf(YoutubeAPI);
    });
    test('scrape.reddit is a RedditAPI instance', () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        expect(client.scrape.reddit).toBeInstanceOf(RedditAPI);
    });
    test('scrape.digikey is a DigikeyAPI instance', () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        expect(client.scrape.digikey).toBeInstanceOf(DigikeyAPI);
    });
    test('scrape.perplexity is a PerplexityAPI instance', () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        expect(client.scrape.perplexity).toBeInstanceOf(PerplexityAPI);
    });
});

describe('bdclient - Lazy initialization', () => {
    test('scrape accessed twice returns same instance', () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        const first = client.scrape;
        const second = client.scrape;
        expect(first).toBe(second);
    });
    test('search accessed twice returns same instance', () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        const first = client.search;
        const second = client.search;
        expect(first).toBe(second);
    });
    test('datasets accessed twice returns same instance', () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        const first = client.datasets;
        const second = client.datasets;
        expect(first).toBe(second);
    });
    test('datasets is a DatasetsClient instance', () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        expect(client.datasets).toBeInstanceOf(DatasetsClient);
    });
    test('datasets.linkedinProfiles is a LinkedinProfilesDataset', () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        expect(client.datasets.linkedinProfiles).toBeInstanceOf(
            LinkedinProfilesDataset,
        );
    });
    test('Object.keys includes scrape, search, datasets', () => {
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        const keys = Object.keys(client);
        expect(keys).toContain('scrape');
        expect(keys).toContain('search');
        expect(keys).toContain('datasets');
    });
});

describe('bdclient - dataFormat md alias', () => {
    test("dataFormat: 'md' is sent to the API as 'markdown'", async () => {
        vi.mocked(Transport.prototype.request).mockClear();
        const client = new bdclient({
            apiKey: 'test_token_1234567890abcdef',
            autoCreateZones: false,
        });
        await client.scrapeUrl('https://example.com', { dataFormat: 'md' });

        const body = JSON.parse(
            vi.mocked(Transport.prototype.request).mock.calls[0][1]
                ?.body as string,
        );
        expect(body.data_format).toBe('markdown');
    });
});

describe('bdclient - API key env fallback', () => {
    test('accepts BRIGHTDATA_API_KEY when BRIGHTDATA_API_TOKEN is unset', () => {
        const { BRIGHTDATA_API_TOKEN, BRIGHTDATA_API_KEY } = process.env;
        delete process.env.BRIGHTDATA_API_TOKEN;
        process.env.BRIGHTDATA_API_KEY = 'env_key_1234567890abcdef';
        try {
            expect(() => new bdclient({ autoCreateZones: false })).not.toThrow();
        } finally {
            if (BRIGHTDATA_API_TOKEN === undefined)
                delete process.env.BRIGHTDATA_API_TOKEN;
            else process.env.BRIGHTDATA_API_TOKEN = BRIGHTDATA_API_TOKEN;
            if (BRIGHTDATA_API_KEY === undefined)
                delete process.env.BRIGHTDATA_API_KEY;
            else process.env.BRIGHTDATA_API_KEY = BRIGHTDATA_API_KEY;
        }
    });
});
