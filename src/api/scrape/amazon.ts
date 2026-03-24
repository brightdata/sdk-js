import type {
    DatasetOptions,
    DiscoverOptions,
    OrchestrateOptions,
    UnknownRecord,
    AmazonCollectProductsFilter,
    AmazonCollectReviewsFilter,
    AmazonCollectSearchFilter,
    AmazonDiscoverProductsByBSUrlFilter,
    AmazonDiscoverProductsByCategoryURLFilter,
    AmazonDiscoverProductsByKeywordFilter,
    AmazonDiscoverProductsByUPCFilter,
} from '../../types/datasets';
import {
    DatasetOptionsSchema,
    DatasetMixedInputSchema,
} from '../../schemas/datasets';
import {
    AmazonCollectProductsFilterSchema,
    AmazonCollectReviewsFilterSchema,
    AmazonCollectSearchFilterSchema,
    AmazonDiscoverProductsByBSUrlFilterSchema,
    AmazonDiscoverProductsByCategoryURLFilterSchema,
    AmazonDiscoverProductsByKeywordFilterSchema,
    AmazonDiscoverProductsByUPCFilterSchema,
} from '../../schemas/filters/amazon';
import { assertSchema } from '../../schemas/utils';
import { BaseAPI, type BaseAPIOptions } from './base';

const DATASET_ID = {
    PRODUCT: 'gd_l7q7dkf244hwjntr0',
    REVIEW: 'gd_le8e811kzy4ggddlq',
    SELLER: 'gd_lhotzucw1etoe5iw1k',
    SEARCH: 'gd_lwdb4vjm1ehb499uxs',
};

const assertInput = (
    input: UnknownRecord[] | string[],
    opts: DatasetOptions = {},
    fn: string,
) => {
    const prefix = `amazon.${fn}: `;
    return [
        assertSchema(DatasetMixedInputSchema, input, `${prefix}invalid input`),
        assertSchema(DatasetOptionsSchema, opts, `${prefix}invalid options`),
    ] as const;
};

export class AmazonAPI extends BaseAPI {
    constructor(opts: BaseAPIOptions) {
        super(opts);
        this.name = 'amazon';
        this.init();
    }
    /**
     * fetch Amazon products for one or more URLs
     * @param input - an array of URLs or filters
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with the response data or snapshot meta
     */
    collectProducts(
        input: string[] | AmazonCollectProductsFilter[],
        opt: DatasetOptions,
    ) {
        this.logger.info(`collectProducts for ${input.length} urls`);
        if (input.length > 0 && typeof input[0] !== 'string') {
            (input as AmazonCollectProductsFilter[]).forEach((item, i) =>
                assertSchema(AmazonCollectProductsFilterSchema, item, `amazon.collectProducts: invalid filter[${i}]`),
            );
        }
        const [safeInput, safeOpt] = assertInput(input, opt, 'collectProducts');
        return this.run(safeInput, DATASET_ID.PRODUCT, safeOpt);
    }
    /**
     * Discover Amazon products by best sellers category URL
     * @param input - an array of filters to starts collection for
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with snapshot meta
     */
    discoverProductsByBestSellerURL(
        input: AmazonDiscoverProductsByBSUrlFilter[],
        opt: DiscoverOptions,
    ) {
        this.logger.info(
            `discoverProductsByBestSellerURL for ${input.length} urls`,
        );
        input.forEach((item, i) =>
            assertSchema(AmazonDiscoverProductsByBSUrlFilterSchema, item, `amazon.discoverProductsByBestSellerURL: invalid filter[${i}]`),
        );
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'discoverProductsByBestSellerURL',
        );
        return this.run(safeInput, DATASET_ID.PRODUCT, {
            ...safeOpt,
            async: true,
            type: 'discover_new',
            discoverBy: 'best_sellers_url',
        });
    }
    /**
     * Discover Amazon products by best sellers category URL
     * @param input - an array of filters to starts collection for
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with snapshot meta
     */
    discoverProductsByCategoryURL(
        input: string[] | AmazonDiscoverProductsByCategoryURLFilter[],
        opt: DiscoverOptions,
    ) {
        this.logger.info(
            `discoverProductsByCategoryURL for ${input.length} urls`,
        );
        if (input.length > 0 && typeof input[0] !== 'string') {
            (input as AmazonDiscoverProductsByCategoryURLFilter[]).forEach((item, i) =>
                assertSchema(AmazonDiscoverProductsByCategoryURLFilterSchema, item, `amazon.discoverProductsByCategoryURL: invalid filter[${i}]`),
            );
        }
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'discoverProductsByCategoryURL',
        );
        return this.run(safeInput, DATASET_ID.PRODUCT, {
            ...safeOpt,
            async: true,
            type: 'discover_new',
            discoverBy: 'category_url',
        });
    }
    /**
     * Discover Amazon products by keywords
     * @param input - an array of filters to starts collection for
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with snapshot meta
     */
    discoverProductsByKeyword(
        input: AmazonDiscoverProductsByKeywordFilter[],
        opt: DiscoverOptions,
    ) {
        this.logger.info(`discoverProductsByKeyword for ${input.length} urls`);
        input.forEach((item, i) =>
            assertSchema(AmazonDiscoverProductsByKeywordFilterSchema, item, `amazon.discoverProductsByKeyword: invalid filter[${i}]`),
        );
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'discoverProductsByKeyword',
        );
        return this.run(safeInput, DATASET_ID.PRODUCT, {
            ...safeOpt,
            async: true,
            type: 'discover_new',
            discoverBy: 'keyword',
        });
    }
    /**
     * Discover Amazon products by UPC number
     * @param input - an array of filters to starts collection for
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with snapshot meta
     */
    discoverProductsByUPC(
        input: AmazonDiscoverProductsByUPCFilter[],
        opt: DiscoverOptions,
    ) {
        this.logger.info(`discoverProductsByUPC for ${input.length} urls`);
        input.forEach((item, i) =>
            assertSchema(AmazonDiscoverProductsByUPCFilterSchema, item, `amazon.discoverProductsByUPC: invalid filter[${i}]`),
        );
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'discoverProductsByUPC',
        );
        return this.run(safeInput, DATASET_ID.PRODUCT, {
            ...safeOpt,
            async: true,
            type: 'discover_new',
            discoverBy: 'upc',
        });
    }
    /**
     * fetch Amazon product reviews by product URLs
     * @param input - an array of URLs or filters
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with the response data or snapshot meta
     */
    collectReviews(
        input: string[] | AmazonCollectReviewsFilter[],
        opt: DatasetOptions,
    ) {
        this.logger.info(`collectReviews for ${input.length} urls`);
        if (input.length > 0 && typeof input[0] !== 'string') {
            (input as AmazonCollectReviewsFilter[]).forEach((item, i) =>
                assertSchema(AmazonCollectReviewsFilterSchema, item, `amazon.collectReviews: invalid filter[${i}]`),
            );
        }
        const [safeInput, safeOpt] = assertInput(input, opt, 'collectReviews');
        return this.run(safeInput, DATASET_ID.REVIEW, safeOpt);
    }
    /**
     * fetch Amazon seller information by URLs
     * @param input - an array of URLs
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with the response data or snapshot meta
     */
    collectSellers(input: string[], opt: DatasetOptions) {
        this.logger.info(`collectSellers for ${input.length} urls`);
        const [safeInput, safeOpt] = assertInput(input, opt, 'collectSellers');
        return this.run(safeInput, DATASET_ID.SELLER, safeOpt);
    }
    /**
     * fetch Amazon product search results
     * @param input - an array of filters
     * @param opt - dataset options to control the request behavior
     * @returns a promise that resolves with the response data or snapshot meta
     */
    collectProductSearch(
        input: AmazonCollectSearchFilter[],
        opt: DatasetOptions,
    ) {
        this.logger.info(`collectProductSearch for ${input.length} urls`);
        input.forEach((item, i) =>
            assertSchema(AmazonCollectSearchFilterSchema, item, `amazon.collectProductSearch: invalid filter[${i}]`),
        );
        const [safeInput, safeOpt] = assertInput(
            input,
            opt,
            'collectProductSearch',
        );
        return this.run(safeInput, DATASET_ID.SEARCH, safeOpt);
    }
    /**
     * Scrape Amazon products — one-call trigger+poll+fetch.
     * Equivalent to Python's client.scrape.amazon.products(url).
     */
    async products(
        input: string[] | AmazonCollectProductsFilter[],
        opts?: OrchestrateOptions,
    ) {
        this.logger.info(`products (orchestrated) for ${input.length} urls`);
        const [safeInput] = assertInput(input, {}, 'products');
        return this.orchestrate(safeInput, DATASET_ID.PRODUCT, opts);
    }
    /**
     * Scrape Amazon reviews — one-call trigger+poll+fetch.
     */
    async reviews(
        input: string[] | AmazonCollectReviewsFilter[],
        opts?: OrchestrateOptions,
    ) {
        this.logger.info(`reviews (orchestrated) for ${input.length} urls`);
        const [safeInput] = assertInput(input, {}, 'reviews');
        return this.orchestrate(safeInput, DATASET_ID.REVIEW, opts);
    }
    /**
     * Scrape Amazon sellers — one-call trigger+poll+fetch.
     */
    async sellers(input: string[], opts?: OrchestrateOptions) {
        this.logger.info(`sellers (orchestrated) for ${input.length} urls`);
        const [safeInput] = assertInput(input, {}, 'sellers');
        return this.orchestrate(safeInput, DATASET_ID.SELLER, opts);
    }
    /**
     * Scrape Amazon product search results — one-call trigger+poll+fetch.
     */
    async productSearch(
        input: AmazonCollectSearchFilter[],
        opts?: OrchestrateOptions,
    ) {
        this.logger.info(
            `productSearch (orchestrated) for ${input.length} items`,
        );
        const [safeInput] = assertInput(input, {}, 'productSearch');
        return this.orchestrate(safeInput, DATASET_ID.SEARCH, opts);
    }
}
