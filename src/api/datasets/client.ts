import { Transport, assertResponse } from '../../core/transport';
import { API_ENDPOINT } from '../../utils/constants';
import { parseJSON } from '../../utils/misc';
import { getLogger } from '../../utils/logger';
import { wrapAPIError } from '../../utils/error-utils';
import { BaseDataset } from './base';
import type { DatasetInfo } from './types';
import {
    LinkedinProfilesDataset,
    LinkedinCompaniesDataset,
} from './platforms/linkedin';
import {
    AmazonProductsDataset,
    AmazonReviewsDataset,
    AmazonSellersDataset,
    AmazonBestSellersDataset,
    AmazonProductsSearchDataset,
    AmazonProductsGlobalDataset,
    AmazonWalmartDataset,
} from './platforms/amazon';
import {
    InstagramProfilesDataset,
    InstagramPostsDataset,
    InstagramCommentsDataset,
    InstagramReelsDataset,
} from './platforms/instagram';
import {
    TiktokProfilesDataset,
    TiktokPostsDataset,
    TiktokCommentsDataset,
    TiktokShopDataset,
} from './platforms/tiktok';
import {
    XTwitterPostsDataset,
    XTwitterProfilesDataset,
} from './platforms/x_twitter';

export class DatasetsClient {
    private transport: Transport;
    private logger = getLogger('datasets');
    private cache = new Map<string, BaseDataset>();

    constructor(opts: { transport: Transport }) {
        this.transport = opts.transport;
    }

    async list(): Promise<DatasetInfo[]> {
        this.logger.debug('list');
        try {
            const response = await this.transport.request(
                API_ENDPOINT.DATASET_LIST,
            );
            const text = await assertResponse(response);
            return parseJSON<DatasetInfo[]>(text);
        } catch (e: unknown) {
            wrapAPIError(e, 'datasets.list');
        }
    }

    get linkedinProfiles(): LinkedinProfilesDataset {
        if (!this.cache.has('linkedin_profiles')) {
            this.cache.set(
                'linkedin_profiles',
                new LinkedinProfilesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('linkedin_profiles') as LinkedinProfilesDataset;
    }

    get linkedinCompanies(): LinkedinCompaniesDataset {
        if (!this.cache.has('linkedin_companies')) {
            this.cache.set(
                'linkedin_companies',
                new LinkedinCompaniesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'linkedin_companies',
        ) as LinkedinCompaniesDataset;
    }

    get amazonProducts(): AmazonProductsDataset {
        if (!this.cache.has('amazon_products')) {
            this.cache.set(
                'amazon_products',
                new AmazonProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('amazon_products') as AmazonProductsDataset;
    }

    get amazonReviews(): AmazonReviewsDataset {
        if (!this.cache.has('amazon_reviews')) {
            this.cache.set(
                'amazon_reviews',
                new AmazonReviewsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('amazon_reviews') as AmazonReviewsDataset;
    }

    get amazonSellers(): AmazonSellersDataset {
        if (!this.cache.has('amazon_sellers_info')) {
            this.cache.set(
                'amazon_sellers_info',
                new AmazonSellersDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('amazon_sellers_info') as AmazonSellersDataset;
    }

    get amazonBestSellers(): AmazonBestSellersDataset {
        if (!this.cache.has('amazon_best_sellers')) {
            this.cache.set(
                'amazon_best_sellers',
                new AmazonBestSellersDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'amazon_best_sellers',
        ) as AmazonBestSellersDataset;
    }

    get amazonProductsSearch(): AmazonProductsSearchDataset {
        if (!this.cache.has('amazon_products_search')) {
            this.cache.set(
                'amazon_products_search',
                new AmazonProductsSearchDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'amazon_products_search',
        ) as AmazonProductsSearchDataset;
    }

    get amazonProductsGlobal(): AmazonProductsGlobalDataset {
        if (!this.cache.has('amazon_products_global')) {
            this.cache.set(
                'amazon_products_global',
                new AmazonProductsGlobalDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'amazon_products_global',
        ) as AmazonProductsGlobalDataset;
    }

    get amazonWalmart(): AmazonWalmartDataset {
        if (!this.cache.has('amazon_walmart')) {
            this.cache.set(
                'amazon_walmart',
                new AmazonWalmartDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('amazon_walmart') as AmazonWalmartDataset;
    }

    // ── Instagram ────────────────────────────────────────────────────

    get instagramProfiles(): InstagramProfilesDataset {
        if (!this.cache.has('instagram_profiles')) {
            this.cache.set(
                'instagram_profiles',
                new InstagramProfilesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'instagram_profiles',
        ) as InstagramProfilesDataset;
    }

    get instagramPosts(): InstagramPostsDataset {
        if (!this.cache.has('instagram_posts')) {
            this.cache.set(
                'instagram_posts',
                new InstagramPostsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('instagram_posts') as InstagramPostsDataset;
    }

    get instagramComments(): InstagramCommentsDataset {
        if (!this.cache.has('instagram_comments')) {
            this.cache.set(
                'instagram_comments',
                new InstagramCommentsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'instagram_comments',
        ) as InstagramCommentsDataset;
    }

    get instagramReels(): InstagramReelsDataset {
        if (!this.cache.has('instagram_reels')) {
            this.cache.set(
                'instagram_reels',
                new InstagramReelsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('instagram_reels') as InstagramReelsDataset;
    }

    // ── TikTok ───────────────────────────────────────────────────────

    get tiktokProfiles(): TiktokProfilesDataset {
        if (!this.cache.has('tiktok_profiles')) {
            this.cache.set(
                'tiktok_profiles',
                new TiktokProfilesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('tiktok_profiles') as TiktokProfilesDataset;
    }

    get tiktokPosts(): TiktokPostsDataset {
        if (!this.cache.has('tiktok_posts')) {
            this.cache.set(
                'tiktok_posts',
                new TiktokPostsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('tiktok_posts') as TiktokPostsDataset;
    }

    get tiktokComments(): TiktokCommentsDataset {
        if (!this.cache.has('tiktok_comments')) {
            this.cache.set(
                'tiktok_comments',
                new TiktokCommentsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('tiktok_comments') as TiktokCommentsDataset;
    }

    get tiktokShop(): TiktokShopDataset {
        if (!this.cache.has('tiktok_shop')) {
            this.cache.set(
                'tiktok_shop',
                new TiktokShopDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('tiktok_shop') as TiktokShopDataset;
    }

    // ── X / Twitter ──────────────────────────────────────────────────

    get xTwitterPosts(): XTwitterPostsDataset {
        if (!this.cache.has('x_twitter_posts')) {
            this.cache.set(
                'x_twitter_posts',
                new XTwitterPostsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('x_twitter_posts') as XTwitterPostsDataset;
    }

    get xTwitterProfiles(): XTwitterProfilesDataset {
        if (!this.cache.has('x_twitter_profiles')) {
            this.cache.set(
                'x_twitter_profiles',
                new XTwitterProfilesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('x_twitter_profiles') as XTwitterProfilesDataset;
    }
}
