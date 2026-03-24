import { SearchAPI } from '../unlocker/search';
import type { RequestAPIOptions } from '../unlocker/request';
import type {
    SearchOptions,
    SearchJSONOptions,
    SingleJSONResponse,
    SingleRawResponse,
    BatchJSONResponse,
    BatchRawResponse,
    AnyResponse,
} from '../../types/request';

type SearchMethodOptions = Omit<SearchOptions, 'searchEngine'>;
type SearchMethodJSONOptions = Omit<SearchJSONOptions, 'searchEngine'>;

export class SearchRouter {
    private searchAPI: SearchAPI;

    constructor(opts: RequestAPIOptions) {
        this.searchAPI = new SearchAPI(opts);
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
