import type { BrightSearchService } from './service.js';
import type { BrightSearchPage } from './result.js';
import type {
    BrightSearchJSONObject,
    BrightSearchNaturalOptions,
    BrightSearchStructuredOptions,
    BrightSearchOptions,
} from '../../schemas/brightsearch.js';

/** Indexed company and professional records through client.search.business. */
export class BusinessSearchService {
    constructor(private readonly service: BrightSearchService) {}

    companies(
        query: string,
        options: BrightSearchNaturalOptions,
    ): Promise<BrightSearchPage>;
    companies(
        query: BrightSearchJSONObject,
        options: BrightSearchStructuredOptions,
    ): Promise<BrightSearchPage>;
    companies(
        query: string | BrightSearchJSONObject,
        options: BrightSearchOptions,
    ): Promise<BrightSearchPage> {
        return typeof query === 'string'
            ? this.service.search(
                  'company',
                  query,
                  options as BrightSearchNaturalOptions,
              )
            : this.service.search(
                  'company',
                  query,
                  options as BrightSearchStructuredOptions,
              );
    }

    people(
        query: string,
        options: BrightSearchNaturalOptions,
    ): Promise<BrightSearchPage>;
    people(
        query: BrightSearchJSONObject,
        options: BrightSearchStructuredOptions,
    ): Promise<BrightSearchPage>;
    people(
        query: string | BrightSearchJSONObject,
        options: BrightSearchOptions,
    ): Promise<BrightSearchPage> {
        return typeof query === 'string'
            ? this.service.search(
                  'people',
                  query,
                  options as BrightSearchNaturalOptions,
              )
            : this.service.search(
                  'people',
                  query,
                  options as BrightSearchStructuredOptions,
              );
    }
}

/** Indexed product records through client.search.ecommerce. */
export class EcommerceSearchService {
    constructor(private readonly service: BrightSearchService) {}

    products(
        query: BrightSearchJSONObject,
        options: BrightSearchStructuredOptions,
    ): Promise<BrightSearchPage> {
        return this.service.search('ecom', query, options);
    }
}
