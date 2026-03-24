import type { Dispatcher } from 'undici';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { Transport } from '../src/core/transport';
import { DatasetsClient } from '../src/api/datasets/client';
import { BaseDataset } from '../src/api/datasets/base';
import { LinkedinProfilesDataset } from '../src/api/datasets/platforms/linkedin';
import {
    AmazonProductsDataset,
    AmazonReviewsDataset,
    AmazonSellersDataset,
    AmazonBestSellersDataset,
    AmazonProductsSearchDataset,
    AmazonProductsGlobalDataset,
    AmazonWalmartDataset,
} from '../src/api/datasets/platforms/amazon';
import {
    InstagramProfilesDataset,
    InstagramPostsDataset,
    InstagramCommentsDataset,
    InstagramReelsDataset,
} from '../src/api/datasets/platforms/instagram';
import {
    TiktokProfilesDataset,
    TiktokPostsDataset,
    TiktokCommentsDataset,
    TiktokShopDataset,
} from '../src/api/datasets/platforms/tiktok';
import {
    XTwitterPostsDataset,
    XTwitterProfilesDataset,
} from '../src/api/datasets/platforms/x_twitter';

const mockRequest = vi.spyOn(Transport.prototype, 'request');

function mockResponse(body: unknown): Dispatcher.ResponseData {
    return {
        statusCode: 200,
        body: {
            text: () => Promise.resolve(JSON.stringify(body)),
        },
    } as Dispatcher.ResponseData;
}

function makeTransport(): Transport {
    return new Transport({ apiKey: 'test_token_1234567890abcdef' });
}

describe('DatasetsClient', () => {
    beforeEach(() => {
        mockRequest.mockReset();
    });

    test('list() calls correct endpoint', async () => {
        const items = [
            { id: 'ds1', name: 'Dataset 1' },
            { id: 'ds2', name: 'Dataset 2' },
        ];
        mockRequest.mockResolvedValueOnce(mockResponse(items));

        const client = new DatasetsClient({ transport: makeTransport() });
        const result = await client.list();

        expect(result).toEqual(items);
        expect(mockRequest).toHaveBeenCalledOnce();
        const calledUrl = mockRequest.mock.calls[0][0] as string;
        expect(calledUrl).toContain('/datasets/list');
    });

    test('linkedinProfiles returns LinkedinProfilesDataset', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.linkedinProfiles).toBeInstanceOf(
            LinkedinProfilesDataset,
        );
    });

    test('linkedinProfiles returns same cached instance', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        const first = client.linkedinProfiles;
        const second = client.linkedinProfiles;
        expect(first).toBe(second);
    });

    test('linkedinCompanies returns cached instance', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        const first = client.linkedinCompanies;
        const second = client.linkedinCompanies;
        expect(first).toBe(second);
    });

    test('amazonProducts returns AmazonProductsDataset', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.amazonProducts).toBeInstanceOf(AmazonProductsDataset);
    });

    test('amazonProducts returns same cached instance', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        const first = client.amazonProducts;
        const second = client.amazonProducts;
        expect(first).toBe(second);
    });

    test('amazonReviews returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.amazonReviews).toBeInstanceOf(AmazonReviewsDataset);
        expect(client.amazonReviews).toBe(client.amazonReviews);
    });

    test('amazonSellers returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.amazonSellers).toBeInstanceOf(AmazonSellersDataset);
        expect(client.amazonSellers).toBe(client.amazonSellers);
    });

    test('amazonBestSellers returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.amazonBestSellers).toBeInstanceOf(AmazonBestSellersDataset);
        expect(client.amazonBestSellers).toBe(client.amazonBestSellers);
    });

    test('amazonProductsSearch returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.amazonProductsSearch).toBeInstanceOf(AmazonProductsSearchDataset);
        expect(client.amazonProductsSearch).toBe(client.amazonProductsSearch);
    });

    test('amazonProductsGlobal returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.amazonProductsGlobal).toBeInstanceOf(AmazonProductsGlobalDataset);
        expect(client.amazonProductsGlobal).toBe(client.amazonProductsGlobal);
    });

    test('amazonWalmart returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.amazonWalmart).toBeInstanceOf(AmazonWalmartDataset);
        expect(client.amazonWalmart).toBe(client.amazonWalmart);
    });

    // ── Instagram ────────────────────────────────────────────────────

    test('instagramProfiles returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.instagramProfiles).toBeInstanceOf(InstagramProfilesDataset);
        expect(client.instagramProfiles).toBe(client.instagramProfiles);
    });

    test('instagramPosts returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.instagramPosts).toBeInstanceOf(InstagramPostsDataset);
        expect(client.instagramPosts).toBe(client.instagramPosts);
    });

    test('instagramComments returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.instagramComments).toBeInstanceOf(InstagramCommentsDataset);
        expect(client.instagramComments).toBe(client.instagramComments);
    });

    test('instagramReels returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.instagramReels).toBeInstanceOf(InstagramReelsDataset);
        expect(client.instagramReels).toBe(client.instagramReels);
    });

    // ── TikTok ───────────────────────────────────────────────────────

    test('tiktokProfiles returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.tiktokProfiles).toBeInstanceOf(TiktokProfilesDataset);
        expect(client.tiktokProfiles).toBe(client.tiktokProfiles);
    });

    test('tiktokPosts returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.tiktokPosts).toBeInstanceOf(TiktokPostsDataset);
        expect(client.tiktokPosts).toBe(client.tiktokPosts);
    });

    test('tiktokComments returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.tiktokComments).toBeInstanceOf(TiktokCommentsDataset);
        expect(client.tiktokComments).toBe(client.tiktokComments);
    });

    test('tiktokShop returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.tiktokShop).toBeInstanceOf(TiktokShopDataset);
        expect(client.tiktokShop).toBe(client.tiktokShop);
    });

    // ── X / Twitter ──────────────────────────────────────────────────

    test('xTwitterPosts returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.xTwitterPosts).toBeInstanceOf(XTwitterPostsDataset);
        expect(client.xTwitterPosts).toBe(client.xTwitterPosts);
    });

    test('xTwitterProfiles returns correct type and caches', () => {
        const client = new DatasetsClient({ transport: makeTransport() });
        expect(client.xTwitterProfiles).toBeInstanceOf(XTwitterProfilesDataset);
        expect(client.xTwitterProfiles).toBe(client.xTwitterProfiles);
    });
});

describe('BaseDataset', () => {
    beforeEach(() => {
        mockRequest.mockReset();
    });

    test('getMetadata() calls correct endpoint with dataset_id', async () => {
        const metadata = {
            id: 'gd_l1viktl72bvl7bjuj0',
            name: 'LinkedIn Profiles',
            fields: [{ name: 'name', type: 'string' }],
        };
        mockRequest.mockResolvedValueOnce(mockResponse(metadata));

        const transport = makeTransport();
        const dataset = new LinkedinProfilesDataset({ transport });
        const result = await dataset.getMetadata();

        expect(result).toEqual(metadata);
        const calledUrl = mockRequest.mock.calls[0][0] as string;
        expect(calledUrl).toContain(
            '/datasets/gd_l1viktl72bvl7bjuj0/metadata',
        );
    });

    test('query() POSTs with dataset_id and filter', async () => {
        mockRequest.mockResolvedValueOnce(
            mockResponse({ snapshot_id: 'snap_123' }),
        );

        const transport = makeTransport();
        const dataset = new LinkedinProfilesDataset({ transport });
        const snapshotId = await dataset.query({ company: 'Acme' });

        expect(snapshotId).toBe('snap_123');
        const calledUrl = mockRequest.mock.calls[0][0] as string;
        expect(calledUrl).toContain('/datasets/filter');
        const calledOpts = mockRequest.mock.calls[0][1] as {
            method: string;
            body: string;
        };
        expect(calledOpts.method).toBe('POST');
        const body = JSON.parse(calledOpts.body);
        expect(body.dataset_id).toBe('gd_l1viktl72bvl7bjuj0');
        expect(body.filter).toEqual({ company: 'Acme' });
    });

    test('query() includes records_limit when provided', async () => {
        mockRequest.mockResolvedValueOnce(
            mockResponse({ snapshot_id: 'snap_456' }),
        );

        const transport = makeTransport();
        const dataset = new LinkedinProfilesDataset({ transport });
        await dataset.query({}, { records_limit: 100 });

        const calledOpts = mockRequest.mock.calls[0][1] as { body: string };
        const body = JSON.parse(calledOpts.body);
        expect(body.records_limit).toBe(100);
    });

    test('sample() delegates to query with empty filter', async () => {
        mockRequest.mockResolvedValueOnce(
            mockResponse({ snapshot_id: 'snap_789' }),
        );

        const transport = makeTransport();
        const dataset = new LinkedinProfilesDataset({ transport });
        const snapshotId = await dataset.sample();

        expect(snapshotId).toBe('snap_789');
        const calledOpts = mockRequest.mock.calls[0][1] as { body: string };
        const body = JSON.parse(calledOpts.body);
        expect(body.filter).toEqual({});
    });

    test('getStatus() calls correct snapshot status endpoint', async () => {
        const status = {
            snapshot_id: 'snap_123',
            status: 'ready',
            records_count: 50,
        };
        mockRequest.mockResolvedValueOnce(mockResponse(status));

        const transport = makeTransport();
        const dataset = new LinkedinProfilesDataset({ transport });
        const result = await dataset.getStatus('snap_123');

        expect(result).toEqual(status);
        const calledUrl = mockRequest.mock.calls[0][0] as string;
        expect(calledUrl).toContain('/datasets/snapshots/snap_123');
        expect(calledUrl).not.toContain('/download');
    });

    test('datasetId is set correctly on all platform datasets', () => {
        const transport = makeTransport();

        const linkedin = new LinkedinProfilesDataset({ transport });
        expect(linkedin.datasetId).toBe('gd_l1viktl72bvl7bjuj0');
        expect(linkedin.name).toBe('linkedin_profiles');

        const amazon = new AmazonProductsDataset({ transport });
        expect(amazon.datasetId).toBe('gd_l7q7dkf244hwjntr0');
        expect(amazon.name).toBe('amazon_products');

        const amazonReviews = new AmazonReviewsDataset({ transport });
        expect(amazonReviews.datasetId).toBe('gd_le8e811kzy4ggddlq');
        expect(amazonReviews.name).toBe('amazon_reviews');

        const amazonSellers = new AmazonSellersDataset({ transport });
        expect(amazonSellers.datasetId).toBe('gd_lhotzucw1etoe5iw1k');
        expect(amazonSellers.name).toBe('amazon_sellers_info');

        const amazonBest = new AmazonBestSellersDataset({ transport });
        expect(amazonBest.datasetId).toBe('gd_l1vijixj9g2vp7563');
        expect(amazonBest.name).toBe('amazon_best_sellers');

        const amazonSearch = new AmazonProductsSearchDataset({ transport });
        expect(amazonSearch.datasetId).toBe('gd_lwdb4vjm1ehb499uxs');
        expect(amazonSearch.name).toBe('amazon_products_search');

        const amazonGlobal = new AmazonProductsGlobalDataset({ transport });
        expect(amazonGlobal.datasetId).toBe('gd_lwhideng15g8jg63s7');
        expect(amazonGlobal.name).toBe('amazon_products_global');

        const amazonWalmart = new AmazonWalmartDataset({ transport });
        expect(amazonWalmart.datasetId).toBe('gd_m4l6s4mn2g2rkx9lia');
        expect(amazonWalmart.name).toBe('amazon_walmart');

        const igProfiles = new InstagramProfilesDataset({ transport });
        expect(igProfiles.datasetId).toBe('gd_l1vikfch901nx3by4');
        expect(igProfiles.name).toBe('instagram_profiles');

        const igPosts = new InstagramPostsDataset({ transport });
        expect(igPosts.datasetId).toBe('gd_lk5ns7kz21pck8jpis');
        expect(igPosts.name).toBe('instagram_posts');

        const igComments = new InstagramCommentsDataset({ transport });
        expect(igComments.datasetId).toBe('gd_ltppn085pokosxh13');
        expect(igComments.name).toBe('instagram_comments');

        const igReels = new InstagramReelsDataset({ transport });
        expect(igReels.datasetId).toBe('gd_lyclm20il4r5helnj');
        expect(igReels.name).toBe('instagram_reels');

        const ttProfiles = new TiktokProfilesDataset({ transport });
        expect(ttProfiles.datasetId).toBe('gd_l1villgoiiidt09ci');
        expect(ttProfiles.name).toBe('tiktok_profiles');

        const ttPosts = new TiktokPostsDataset({ transport });
        expect(ttPosts.datasetId).toBe('gd_lu702nij2f790tmv9h');
        expect(ttPosts.name).toBe('tiktok_posts');

        const ttComments = new TiktokCommentsDataset({ transport });
        expect(ttComments.datasetId).toBe('gd_lkf2st302ap89utw5k');
        expect(ttComments.name).toBe('tiktok_comments');

        const ttShop = new TiktokShopDataset({ transport });
        expect(ttShop.datasetId).toBe('gd_m45m1u911dsa4274pi');
        expect(ttShop.name).toBe('tiktok_shop');

        const xPosts = new XTwitterPostsDataset({ transport });
        expect(xPosts.datasetId).toBe('gd_lwxkxvnf1cynvib9co');
        expect(xPosts.name).toBe('x_twitter_posts');

        const xProfiles = new XTwitterProfilesDataset({ transport });
        expect(xProfiles.datasetId).toBe('gd_lwxmeb2u1cniijd7t4');
        expect(xProfiles.name).toBe('x_twitter_profiles');
    });
});
