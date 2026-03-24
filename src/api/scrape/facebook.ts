import type {
    DatasetOptions,
    DiscoverOptions,
    OrchestrateOptions,
    UnknownRecord,
    FacebookCollectUserPostsFilter,
    FacebookCollectGroupPostsFilter,
    FacebookCollectPostCommentsFilter,
    InstagramDiscoverReelsByProfileURLFilter,
    FacebookCompanyReviewsFilter,
    FacebookDiscoverPostsByUserNameFilter,
    FacebookDiscoverMarketplaceItemsByKeywordFilter,
    FacebookDiscoverMarketplaceItemsByURLFilter,
    FacebookDiscoverEventsByURLFilter,
    FacebookDiscoverEventsByVenueFilter,
} from '../../types/datasets';
import {
    DatasetOptionsSchema,
    DatasetMixedInputSchema,
} from '../../schemas/datasets';
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
} from '../../schemas/filters/facebook';
import { InstagramDiscoverReelsByProfileURLFilterSchema } from '../../schemas/filters/instagram';
import { assertSchema } from '../../schemas/utils';
import { BaseAPI, type BaseAPIOptions } from './base';

const DATASET_ID = {
    POSTS_USER: 'gd_lkaxegm826bjpoo9m5',
    POSTS_GROUP: 'gd_lz11l67o2cb3r0lkj3',
    COMMENTS: 'gd_lkay758p1eanlolqw8',
    MARKETPLACE: 'gd_lvt9iwuh6fbcwmx1a',
    POSTS: 'gd_lyclm1571iy3mv57zw',
    EVENTS: 'gd_m14sd0to1jz48ppm51',
    REELS_USER: 'gd_lyclm3ey2q6rww027t',
    REVIEWS_COMPANY: 'gd_m0dtqpiu1mbcyc2g86',
    PROFILES_USER: 'gd_mf0urb782734ik94dz',
};

const assertInput = (
    input: UnknownRecord[] | string[],
    opts: DatasetOptions = {},
    fn: string,
) => {
    const prefix = `facebook.${fn}: `;
    return [
        assertSchema(DatasetMixedInputSchema, input, `${prefix}invalid input`),
        assertSchema(DatasetOptionsSchema, opts, `${prefix}invalid options`),
    ] as const;
};

export class FacebookAPI extends BaseAPI {
    constructor(opts: BaseAPIOptions) {
        super(opts);
        this.name = 'facebook';
        this.init();
    }
    /**
     * Fetch Facebook user posts data for one or more profile URLs.
     * @param input - an array of Facebook profile URLs or filters
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with the profile data or snapshot meta
     */
    collectUserPosts(
        input: string[] | FacebookCollectUserPostsFilter[],
        opt: DatasetOptions,
    ) {
        this.logger.info(`collectUserPosts for ${input.length} inputs`);
        if (input.length > 0 && typeof input[0] !== 'string') {
            (input as FacebookCollectUserPostsFilter[]).forEach((item, i) =>
                assertSchema(FacebookCollectUserPostsFilterSchema, item, `facebook.collectUserPosts: invalid filter[${i}]`),
            );
        }
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectUserPosts',
        );
        return this.run(safeInput, DATASET_ID.POSTS_USER, safeOpt);
    }
    /**
     * Discover Facebook user posts data by one or more user names.
     * @param input - an array of filters to starts collection for
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with snapshot meta
     */
    discoverPostsByUserName(
        input: FacebookDiscoverPostsByUserNameFilter[],
        opt: DiscoverOptions,
    ) {
        this.logger.info(`discoverPostsByUserName for ${input.length} urls`);
        input.forEach((item, i) =>
            assertSchema(FacebookDiscoverPostsByUserNameFilterSchema, item, `facebook.discoverPostsByUserName: invalid filter[${i}]`),
        );
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'discoverPostsByUserName',
        );
        return this.run(safeInput, DATASET_ID.POSTS_USER, {
            ...safeOpt,
            async: true,
            type: 'discover_new',
            discoverBy: 'user_name',
        });
    }
    /**
     * Fetch Facebook group posts data for one or more group URLs.
     * @param input - an array of Facebook group URLs or filters
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with the group posts data or snapshot meta
     */
    collectGroupPosts(
        input: string[] | FacebookCollectGroupPostsFilter[],
        opt: DatasetOptions,
    ) {
        this.logger.info(`collectGroupPosts for ${input.length} inputs`);
        if (input.length > 0 && typeof input[0] !== 'string') {
            (input as FacebookCollectGroupPostsFilter[]).forEach((item, i) =>
                assertSchema(FacebookCollectGroupPostsFilterSchema, item, `facebook.collectGroupPosts: invalid filter[${i}]`),
            );
        }
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectGroupPosts',
        );
        return this.run(safeInput, DATASET_ID.POSTS_GROUP, safeOpt);
    }
    /**
     * Fetch Facebook post comments data for one or more post URLs.
     * @param input - an array of Facebook post URLs or filters
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with the post comments data or snapshot meta
     */
    collectPostComments(
        input: string[] | FacebookCollectPostCommentsFilter[],
        opt: DatasetOptions,
    ) {
        this.logger.info(`collectPostComments for ${input.length} inputs`);
        if (input.length > 0 && typeof input[0] !== 'string') {
            (input as FacebookCollectPostCommentsFilter[]).forEach((item, i) =>
                assertSchema(FacebookCollectPostCommentsFilterSchema, item, `facebook.collectPostComments: invalid filter[${i}]`),
            );
        }
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectPostComments',
        );
        return this.run(safeInput, DATASET_ID.COMMENTS, safeOpt);
    }
    /**
     * Fetch Facebook marketplace item data for one or more item URLs.
     * @param input - an array of Facebook marketplace items URLs or filters
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with the marketplace items data or snapshot meta
     */
    collectMarketplaceItems(
        input: string[] | UnknownRecord[],
        opt: DatasetOptions,
    ) {
        this.logger.info(`collectMarketplaceItems for ${input.length} inputs`);
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectMarketplaceItems',
        );
        return this.run(safeInput, DATASET_ID.MARKETPLACE, safeOpt);
    }
    /**
     * Discover Facebook marketplace item data by one or more keywords.
     * @param input - an array of filters to starts collection for
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with snapshot meta
     */
    discoverMarketplaceItemsByKeyword(
        input: FacebookDiscoverMarketplaceItemsByKeywordFilter[],
        opt: DiscoverOptions,
    ) {
        this.logger.info(
            `discoverMarketplaceItemsByKeyword for ${input.length} urls`,
        );
        input.forEach((item, i) =>
            assertSchema(FacebookDiscoverMarketplaceItemsByKeywordFilterSchema, item, `facebook.discoverMarketplaceItemsByKeyword: invalid filter[${i}]`),
        );
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'discoverMarketplaceItemsByKeyword',
        );
        return this.run(safeInput, DATASET_ID.MARKETPLACE, {
            ...safeOpt,
            async: true,
            type: 'discover_new',
            discoverBy: 'keyword',
        });
    }
    /**
     * Discover Facebook marketplace item data by one or more market URLs.
     * @param input - an array of filters to starts collection for
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with snapshot meta
     */
    discoverMarketplaceItemsByURL(
        input: string[] | FacebookDiscoverMarketplaceItemsByURLFilter[],
        opt: DiscoverOptions,
    ) {
        this.logger.info(
            `discoverMarketplaceItemsByURL for ${input.length} urls`,
        );
        if (input.length > 0 && typeof input[0] !== 'string') {
            (input as FacebookDiscoverMarketplaceItemsByURLFilter[]).forEach((item, i) =>
                assertSchema(FacebookDiscoverMarketplaceItemsByURLFilterSchema, item, `facebook.discoverMarketplaceItemsByURL: invalid filter[${i}]`),
            );
        }
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'discoverMarketplaceItemsByURL',
        );
        return this.run(safeInput, DATASET_ID.MARKETPLACE, {
            ...safeOpt,
            async: true,
            type: 'discover_new',
            discoverBy: 'url',
        });
    }
    /**
     * Fetch Facebook posts data by one or more URLs.
     * @param input - an array of Facebook post URLs or filters
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with the posts data or snapshot meta
     */
    collectPosts(input: string[] | UnknownRecord[], opt: DatasetOptions) {
        this.logger.info(`collectPosts for ${input.length} inputs`);
        const [safeInput, safeOpt] = assertInput(input, opt, 'collectPosts');
        return this.run(safeInput, DATASET_ID.POSTS, safeOpt);
    }
    /**
     * Fetch Facebook events data by one or more URLs.
     * @param input - an array of Facebook event URLs or filters
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with the events data or snapshot meta
     */
    collectEvents(input: string[] | UnknownRecord[], opt: DatasetOptions) {
        this.logger.info(`collectEvents for ${input.length} inputs`);
        const [safeInput, safeOpt] = assertInput(input, opt, 'collectEvents');
        return this.run(safeInput, DATASET_ID.EVENTS, safeOpt);
    }
    /**
     * Discover Facebook events by search URLs
     * @param input - an array of filters to starts collection for
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with snapshot meta
     */
    discoverEventsByURL(
        input: string[] | FacebookDiscoverEventsByURLFilter[],
        opt: DiscoverOptions,
    ) {
        this.logger.info(`discoverEventsByURL for ${input.length} urls`);
        if (input.length > 0 && typeof input[0] !== 'string') {
            (input as FacebookDiscoverEventsByURLFilter[]).forEach((item, i) =>
                assertSchema(FacebookDiscoverEventsByURLFilterSchema, item, `facebook.discoverEventsByURL: invalid filter[${i}]`),
            );
        }
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'discoverEventsByURL',
        );
        return this.run(safeInput, DATASET_ID.EVENTS, {
            ...safeOpt,
            async: true,
            type: 'discover_new',
            discoverBy: 'url',
        });
    }
    /**
     * Discover Facebook events by search URLs
     * @param input - an array of filters to starts collection for
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with snapshot meta
     */
    discoverEventsByVenue(
        input: string[] | FacebookDiscoverEventsByVenueFilter[],
        opt: DiscoverOptions,
    ) {
        this.logger.info(`discoverEventsByVenue for ${input.length} venues`);
        if (input.length > 0 && typeof input[0] !== 'string') {
            (input as FacebookDiscoverEventsByVenueFilter[]).forEach((item, i) =>
                assertSchema(FacebookDiscoverEventsByVenueFilterSchema, item, `facebook.discoverEventsByVenue: invalid filter[${i}]`),
            );
        }
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'discoverEventsByVenue',
        );
        return this.run(safeInput, DATASET_ID.EVENTS, {
            ...safeOpt,
            async: true,
            type: 'discover_new',
            discoverBy: 'venue',
        });
    }
    /**
     * Fetch Instagram reels data by one or more profile URLs.
     * @param input - an array of Instagram profile URLs or filters
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with the reels data or snapshot meta
     */
    collectUserReels(
        input: string[] | InstagramDiscoverReelsByProfileURLFilter[],
        opt: DatasetOptions,
    ) {
        this.logger.info(`collectUserReels for ${input.length} inputs`);
        if (input.length > 0 && typeof input[0] !== 'string') {
            (input as InstagramDiscoverReelsByProfileURLFilter[]).forEach((item, i) =>
                assertSchema(InstagramDiscoverReelsByProfileURLFilterSchema, item, `facebook.collectUserReels: invalid filter[${i}]`),
            );
        }
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectUserReels',
        );
        return this.run(safeInput, DATASET_ID.REELS_USER, safeOpt);
    }
    /**
     * Fetch company reviews data by one or more company URLs.
     * @param input - an array of Facebook company URLs or filters
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with the company reviews data or snapshot meta
     */
    collectCompanyReviews(
        input: string[] | FacebookCompanyReviewsFilter[],
        opt: DatasetOptions,
    ) {
        this.logger.info(`collectCompanyReviews for ${input.length} inputs`);
        if (input.length > 0 && typeof input[0] !== 'string') {
            (input as FacebookCompanyReviewsFilter[]).forEach((item, i) =>
                assertSchema(FacebookCompanyReviewsFilterSchema, item, `facebook.collectCompanyReviews: invalid filter[${i}]`),
            );
        }
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectCompanyReviews',
        );
        return this.run(safeInput, DATASET_ID.REVIEWS_COMPANY, safeOpt);
    }
    /**
     * Fetch user profile data by one or more profile URLs.
     * @param input - an array of Facebook profile URLs or filters
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with the user profile data or snapshot meta
     */
    collectUserProfiles(
        input: string[] | UnknownRecord[],
        opt: DatasetOptions,
    ) {
        this.logger.info(`collectUserProfiles for ${input.length} inputs`);
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectUserProfiles',
        );
        return this.run(safeInput, DATASET_ID.PROFILES_USER, safeOpt);
    }
    /**
     * Scrape Facebook user posts — one-call trigger+poll+fetch.
     */
    async userPosts(
        input: string[] | FacebookCollectUserPostsFilter[],
        opts?: OrchestrateOptions,
    ) {
        this.logger.info(`userPosts (orchestrated) for ${input.length} inputs`);
        const [safeInput] = assertInput(input, {}, 'userPosts');
        return this.orchestrate(safeInput, DATASET_ID.POSTS_USER, opts);
    }
    /**
     * Scrape Facebook group posts — one-call trigger+poll+fetch.
     */
    async groupPosts(
        input: string[] | FacebookCollectGroupPostsFilter[],
        opts?: OrchestrateOptions,
    ) {
        this.logger.info(
            `groupPosts (orchestrated) for ${input.length} inputs`,
        );
        const [safeInput] = assertInput(input, {}, 'groupPosts');
        return this.orchestrate(safeInput, DATASET_ID.POSTS_GROUP, opts);
    }
    /**
     * Scrape Facebook post comments — one-call trigger+poll+fetch.
     */
    async postComments(
        input: string[] | FacebookCollectPostCommentsFilter[],
        opts?: OrchestrateOptions,
    ) {
        this.logger.info(
            `postComments (orchestrated) for ${input.length} inputs`,
        );
        const [safeInput] = assertInput(input, {}, 'postComments');
        return this.orchestrate(safeInput, DATASET_ID.COMMENTS, opts);
    }
    /**
     * Scrape Facebook company reviews — one-call trigger+poll+fetch.
     */
    async companyReviews(
        input: string[] | FacebookCompanyReviewsFilter[],
        opts?: OrchestrateOptions,
    ) {
        this.logger.info(
            `companyReviews (orchestrated) for ${input.length} inputs`,
        );
        const [safeInput] = assertInput(input, {}, 'companyReviews');
        return this.orchestrate(safeInput, DATASET_ID.REVIEWS_COMPANY, opts);
    }
}
