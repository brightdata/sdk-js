// Search API: SearchRouter, results.
// Usage: import { SearchRouter, SearchResult } from '@brightdata/sdk/search'

export { SearchRouter } from './api/search/router.js';
export { SearchResult } from './models/result.js';
export type { SearchResultFields } from './models/result.js';

export {
    BrightSearchService,
    BrightSearchPage,
    BusinessSearchService,
    EcommerceSearchService,
} from './api/brightsearch/index.js';
export type {
    BrightSearchCategory,
    BrightSearchMode,
    BrightSearchJSONValue,
    BrightSearchJSONObject,
    BrightSearchOptions,
    BrightSearchNaturalOptions,
    BrightSearchStructuredOptions,
    BrightSearchView,
    BrightSearchDebug,
    BrightSearchEnvelope,
    BrightSearchMeta,
    BrightSearchDocument,
} from './schemas/brightsearch.js';
