import { SearchAPI } from '../unlocker/search.js';
import { BrightSearchService } from '../brightsearch/service.js';
import {
    BusinessSearchService,
    EcommerceSearchService,
} from '../brightsearch/namespaces.js';
import type { RequestAPIOptions } from '../unlocker/request.js';
import type {
    SearchOptions,
    SearchJSONOptions,
    SingleJSONResponse,
    SingleRawResponse,
    BatchJSONResponse,
    BatchRawResponse,
    AnyResponse,
} from '../../types/request.js';

type SearchMethodOptions = Omit<SearchOptions, 'searchEngine'>;
type SearchMethodJSONOptions = Omit<SearchJSONOptions, 'searchEngine'>;

export class SearchRouter {
    private searchAPI: SearchAPI;
    readonly business: BusinessSearchService;
    readonly ecommerce: EcommerceSearchService;

    constructor(opts: RequestAPIOptions) {
        this.searchAPI = new SearchAPI(opts);
        const brightSearch = new BrightSearchService(opts.transport);
        this.business = new BusinessSearchService(brightSearch);
        this.ecommerce = new EcommerceSearchService(brightSearch);
    }

    // prettier-ignore
    google(query: string, options: SearchMethodJSONOptions): Promise<SingleJSONResponse>;
    // prettier-ignore
    google(query: string, options?: SearchMethodOptions): Promise<SingleRawResponse>;
    // prettier-ignore
    google(query: string[], options: SearchMethodJSONOptions): Promise<BatchJSONResponse>;
    // prettier-ignore
    google(query: string[], options?: SearchMethodOptions): Promise<BatchRawResponse>;
    google(
        query: string | string[],
        options?: SearchMethodOptions | SearchMethodJSONOptions,
    ): Promise<AnyResponse> {
        return this.searchAPI.handle(
            query as string,
            { ...options, searchEngine: 'google' } as SearchOptions,
        );
    }

    // prettier-ignore
    bing(query: string, options: SearchMethodJSONOptions): Promise<SingleJSONResponse>;
    // prettier-ignore
    bing(query: string, options?: SearchMethodOptions): Promise<SingleRawResponse>;
    // prettier-ignore
    bing(query: string[], options: SearchMethodJSONOptions): Promise<BatchJSONResponse>;
    // prettier-ignore
    bing(query: string[], options?: SearchMethodOptions): Promise<BatchRawResponse>;
    bing(
        query: string | string[],
        options?: SearchMethodOptions | SearchMethodJSONOptions,
    ): Promise<AnyResponse> {
        return this.searchAPI.handle(
            query as string,
            { ...options, searchEngine: 'bing' } as SearchOptions,
        );
    }

    // prettier-ignore
    yandex(query: string, options: SearchMethodJSONOptions): Promise<SingleJSONResponse>;
    // prettier-ignore
    yandex(query: string, options?: SearchMethodOptions): Promise<SingleRawResponse>;
    // prettier-ignore
    yandex(query: string[], options: SearchMethodJSONOptions): Promise<BatchJSONResponse>;
    // prettier-ignore
    yandex(query: string[], options?: SearchMethodOptions): Promise<BatchRawResponse>;
    yandex(
        query: string | string[],
        options?: SearchMethodOptions | SearchMethodJSONOptions,
    ): Promise<AnyResponse> {
        return this.searchAPI.handle(
            query as string,
            { ...options, searchEngine: 'yandex' } as SearchOptions,
        );
    }
}
