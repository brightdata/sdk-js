import { describe, it, expect } from 'vitest';
import { assertSchema } from '../src/schemas/utils';
import { ValidationError } from '../src/utils/errors';

import { ChatgptFilterSchema } from '../src/schemas/filters/chatgpt';
import {
    LinkedinProfileFilterSchema,
    LinkedinJobFilterSchema,
} from '../src/schemas/filters/linkedin';
import {
    AmazonCollectProductsFilterSchema,
    AmazonCollectReviewsFilterSchema,
    AmazonCollectSearchFilterSchema,
    AmazonDiscoverProductsByBSUrlFilterSchema,
    AmazonDiscoverProductsByCategoryURLFilterSchema,
    AmazonDiscoverProductsByKeywordFilterSchema,
    AmazonDiscoverProductsByUPCFilterSchema,
} from '../src/schemas/filters/amazon';
import {
    InstagramDiscoverPostsByProfileURLFilterSchema,
    InstagramDiscoverReelsByProfileURLFilterSchema,
} from '../src/schemas/filters/instagram';
import {
    FacebookCollectUserPostsFilterSchema,
    FacebookCollectGroupPostsFilterSchema,
    FacebookCollectPostCommentsFilterSchema,
    FacebookCompanyReviewsFilterSchema,
    FacebookDiscoverPostsByUserNameFilterSchema,
    FacebookDiscoverMarketplaceItemsByKeywordFilterSchema,
    FacebookDiscoverMarketplaceItemsByURLFilterSchema,
    FacebookDiscoverEventsByURLFilterSchema,
    FacebookDiscoverEventsByVenueFilterSchema,
} from '../src/schemas/filters/facebook';

describe('ChatGPT filter', () => {
    it('accepts valid input', () => {
        assertSchema(ChatgptFilterSchema, { prompt: 'hello' }, 'test');
    });

    it('rejects missing required field', () => {
        expect(() => assertSchema(ChatgptFilterSchema, {}, 'test')).toThrow(ValidationError);
    });

    it('rejects unknown field (strict)', () => {
        expect(() =>
            assertSchema(ChatgptFilterSchema, { prompt: 'hello', promptt: 'typo' }, 'test'),
        ).toThrow(ValidationError);
    });
});

describe('LinkedIn filters', () => {
    it('ProfileFilter accepts valid input', () => {
        assertSchema(LinkedinProfileFilterSchema, { first_name: 'John', last_name: 'Doe' }, 'test');
    });

    it('ProfileFilter rejects missing last_name', () => {
        expect(() =>
            assertSchema(LinkedinProfileFilterSchema, { first_name: 'John' }, 'test'),
        ).toThrow(ValidationError);
    });

    it('ProfileFilter rejects unknown field', () => {
        expect(() =>
            assertSchema(LinkedinProfileFilterSchema, { first_name: 'John', last_name: 'Doe', typo: true }, 'test'),
        ).toThrow(ValidationError);
    });

    it('JobFilter accepts valid input', () => {
        assertSchema(LinkedinJobFilterSchema, { location: 'New York' }, 'test');
    });

    it('JobFilter accepts with enum fields', () => {
        assertSchema(LinkedinJobFilterSchema, {
            location: 'NYC',
            time_range: 'Past week',
            job_type: 'Full-time',
        }, 'test');
    });

    it('JobFilter rejects invalid enum value', () => {
        expect(() =>
            assertSchema(LinkedinJobFilterSchema, { location: 'NYC', time_range: 'invalid' }, 'test'),
        ).toThrow(ValidationError);
    });
});

describe('Amazon filters', () => {
    it('CollectProducts accepts valid input', () => {
        assertSchema(AmazonCollectProductsFilterSchema, { url: 'https://amazon.com/dp/123' }, 'test');
    });

    it('CollectProducts rejects unknown field', () => {
        expect(() =>
            assertSchema(AmazonCollectProductsFilterSchema, { url: 'https://a.com', unknownField: true }, 'test'),
        ).toThrow(ValidationError);
    });

    it('CollectReviews accepts valid input', () => {
        assertSchema(AmazonCollectReviewsFilterSchema, { url: 'https://a.com' }, 'test');
    });

    it('CollectSearch requires keyword', () => {
        expect(() =>
            assertSchema(AmazonCollectSearchFilterSchema, { url: 'https://a.com' }, 'test'),
        ).toThrow(ValidationError);
    });

    it('DiscoverByBSUrl accepts valid input', () => {
        assertSchema(AmazonDiscoverProductsByBSUrlFilterSchema, { category_url: 'https://a.com/best-sellers' }, 'test');
    });

    it('DiscoverByCategoryURL accepts valid input', () => {
        assertSchema(AmazonDiscoverProductsByCategoryURLFilterSchema, { url: 'https://a.com/cat' }, 'test');
    });

    it('DiscoverByKeyword accepts valid input', () => {
        assertSchema(AmazonDiscoverProductsByKeywordFilterSchema, { keyword: 'laptop' }, 'test');
    });

    it('DiscoverByUPC accepts valid input', () => {
        assertSchema(AmazonDiscoverProductsByUPCFilterSchema, { upc: '012345678901' }, 'test');
    });
});

describe('Instagram filters', () => {
    it('PostsByProfileURL accepts valid input', () => {
        assertSchema(InstagramDiscoverPostsByProfileURLFilterSchema, { url: 'https://instagram.com/user' }, 'test');
    });

    it('PostsByProfileURL rejects missing url', () => {
        expect(() =>
            assertSchema(InstagramDiscoverPostsByProfileURLFilterSchema, {}, 'test'),
        ).toThrow(ValidationError);
    });

    it('PostsByProfileURL rejects unknown field', () => {
        expect(() =>
            assertSchema(InstagramDiscoverPostsByProfileURLFilterSchema, { url: 'https://ig.com', typo: 1 }, 'test'),
        ).toThrow(ValidationError);
    });

    it('ReelsByProfileURL accepts valid input', () => {
        assertSchema(InstagramDiscoverReelsByProfileURLFilterSchema, { url: 'https://instagram.com/user' }, 'test');
    });
});

describe('Facebook filters', () => {
    it('CollectUserPosts accepts valid input', () => {
        assertSchema(FacebookCollectUserPostsFilterSchema, { url: 'https://facebook.com/user' }, 'test');
    });

    it('CollectUserPosts rejects unknown field', () => {
        expect(() =>
            assertSchema(FacebookCollectUserPostsFilterSchema, { url: 'https://fb.com', typo: true }, 'test'),
        ).toThrow(ValidationError);
    });

    it('CollectGroupPosts accepts valid input', () => {
        assertSchema(FacebookCollectGroupPostsFilterSchema, { url: 'https://facebook.com/group' }, 'test');
    });

    it('CollectPostComments accepts valid input', () => {
        assertSchema(FacebookCollectPostCommentsFilterSchema, { url: 'https://fb.com/post' }, 'test');
    });

    it('CompanyReviews accepts valid input', () => {
        assertSchema(FacebookCompanyReviewsFilterSchema, { url: 'https://fb.com/company' }, 'test');
    });

    it('DiscoverPostsByUserName requires user_name', () => {
        expect(() =>
            assertSchema(FacebookDiscoverPostsByUserNameFilterSchema, {}, 'test'),
        ).toThrow(ValidationError);
    });

    it('DiscoverMarketplaceByKeyword accepts valid input', () => {
        assertSchema(FacebookDiscoverMarketplaceItemsByKeywordFilterSchema, { keyword: 'ps5' }, 'test');
    });

    it('DiscoverMarketplaceByKeyword accepts with enum', () => {
        assertSchema(FacebookDiscoverMarketplaceItemsByKeywordFilterSchema, {
            keyword: 'ps5',
            date_listed: 'Last 7 days',
        }, 'test');
    });

    it('DiscoverMarketplaceByURL accepts valid input', () => {
        assertSchema(FacebookDiscoverMarketplaceItemsByURLFilterSchema, { url: 'https://fb.com/marketplace' }, 'test');
    });

    it('DiscoverEventsByURL accepts valid input', () => {
        assertSchema(FacebookDiscoverEventsByURLFilterSchema, { url: 'https://fb.com/events' }, 'test');
    });

    it('DiscoverEventsByVenue accepts valid input', () => {
        assertSchema(FacebookDiscoverEventsByVenueFilterSchema, { url: 'https://fb.com/venue', upcoming_events_only: true }, 'test');
    });
});
