import type {
    SearchOptions,
    SearchEngine,
    RequestOptions,
    RequestJSONOptions,
    SingleJSONResponse,
    SingleRawResponse,
    BatchJSONResponse,
    BatchRawResponse,
    SingleResponse,
    BatchResponse,
} from '../../types/request';
import { RequestAPI, type RequestAPIOptions } from './request';
import { assertSchema } from '../../schemas/utils';
import { SearchQueryParamSchema } from '../../schemas/client';
import { SearchOptionsSchema } from '../../schemas/request';

const buildSERPUrl = (opt: SearchOptions, query: string) => {
    const q = encodeURIComponent(query.trim());
    const engine = opt.searchEngine || 'google';
    const num = opt.numResults || 10;
    const lang = opt.language || 'en';

    switch (engine) {
        case 'bing': {
            let url = `https://www.bing.com/search?q=${q}&count=${num}`;
            if (opt.country) url += `&mkt=${lang}_${opt.country.toUpperCase()}`;
            return url;
        }
        case 'yandex': {
            let url = `https://yandex.com/search/?text=${q}&numdoc=${num}`;
            return url;
        }
        case 'google':
        default: {
            let url = `https://www.google.com/search?q=${q}&brd_json=1`;
            if (opt.start) url += `&start=${opt.start}`;
            if (lang) url += `&hl=${lang}`;
            if (opt.country) url += `&gl=${opt.country}`;
            return url;
        }
    }
};

export class SearchAPI extends RequestAPI {
    constructor(opts: RequestAPIOptions) {
        super(opts);
        this.name = 'search';
        this.zoneType = 'serp';
        this.init();
    }

    // prettier-ignore
    override async handle(val: string, opts?: RequestJSONOptions): Promise<SingleJSONResponse>;
    // prettier-ignore
    override async handle(val: string, opts?: RequestOptions): Promise<SingleRawResponse>;
    // prettier-ignore
    override async handle(val: string[], opts?: RequestJSONOptions): Promise<BatchJSONResponse>;
    // prettier-ignore
    override async handle(val: string[], opts?: RequestOptions): Promise<BatchRawResponse>;
    override async handle(
        val: string | string[],
        opts: RequestOptions | RequestJSONOptions = {},
    ): Promise<SingleResponse | BatchResponse> {
        const safeVal = assertSchema(
            SearchQueryParamSchema,
            val,
            'search.query',
        );
        const safeOpts = assertSchema(
            SearchOptionsSchema,
            opts,
            'search.options',
        );
        return super.handle(safeVal as string, safeOpts);
    }

    protected override getURL(content: string, opt: SearchOptions) {
        return buildSERPUrl(opt, content);
    }

    protected override getMethod() {
        return 'GET' as const;
    }
}
