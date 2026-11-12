// Compiled against the actual dist declarations by the post-build smoke script.
import {
    bdclient,
    BrightSearchService,
    BrightSearchPage,
} from '@brightdata/sdk';
import type {
    BrightSearchJSONObject,
    BrightSearchNaturalOptions,
    HTTPResponseContext,
    BusinessSearchService,
} from '@brightdata/sdk';
import { BrightSearchPage as SearchPage } from '@brightdata/sdk/search';
import type {
    BrightSearchStructuredOptions,
    SearchRouter,
    EcommerceSearchService,
} from '@brightdata/sdk/search';

declare const client: bdclient;
declare const router: SearchRouter;
declare const service: BrightSearchService;
const business: BusinessSearchService = client.search.business;
const ecommerce: EcommerceSearchService = client.search.ecommerce;
declare const naturalMode: 'instant' | 'smart';
const query: BrightSearchJSONObject = {
    equals: { future_field: null },
    and: [{ range: { price: { '>=': 0 } } }],
};
const natural: BrightSearchNaturalOptions = {
    mode: naturalMode,
    debug: { trace: false, benchmark: 0, __overrides__: { x: null } },
};
const structured: BrightSearchStructuredOptions = {
    mode: 'ludicrous',
    view: { fields: ['future'] },
};
const first: Promise<BrightSearchPage> = client.search.business.companies(
    'query',
    natural,
);
const second: Promise<SearchPage> = router.business.people(query, structured);
const third: Promise<SearchPage> = client.search.ecommerce.products(
    query,
    structured,
);
const fourth: Promise<BrightSearchPage> = service.search(
    'people',
    'query',
    natural,
);
const fifth: Promise<BrightSearchPage> = service.search(
    'ecom',
    query,
    structured,
);
const page = await first;
const id: string = page.reqId;
const matched: number = page.meta.matched;
const unknownField: unknown = page.documents[0]?.data.future;
declare const context: HTTPResponseContext;
const requestId: string | undefined = context.reqId;
void [second, third, fourth, fifth, id, matched, unknownField, requestId];
void [business, ecommerce];

// @ts-expect-error companies belong under search.business
client.search.company('q', natural);
// @ts-expect-error people belong under search.business
client.search.people('q', natural);
// @ts-expect-error products belong under search.ecommerce
client.search.ecom(query, structured);

// @ts-expect-error explicit mode required
client.search.business.companies('q', {});
// @ts-expect-error required options
client.search.business.people('q');
// @ts-expect-error ludicrous requires an object
client.search.business.companies('q', { mode: 'ludicrous' });
// @ts-expect-error instant requires a string
client.search.business.people(query, { mode: 'instant' });
// @ts-expect-error smart requires a string
router.business.companies(query, { mode: 'smart' });
// @ts-expect-error arrays are not structured query roots
router.business.people([query], structured);
// @ts-expect-error ecom does not support smart
client.search.ecommerce.products(query, { mode: 'smart' });
// @ts-expect-error ecom does not support natural language
client.search.ecommerce.products('q', structured);
// @ts-expect-error SERP options do not apply
client.search.business.companies('q', { mode: 'instant', zone: 'serp' });
// @ts-expect-error diagnostics cannot overwrite the query
client.search.business.companies('q', {
    mode: 'instant',
    debug: { query: {} },
});
// @ts-expect-error direct service also correlates mode and query
service.search('company', 'q', structured);
// @ts-expect-error direct service restricts ecom modes
service.search('ecom', 'q', natural);
// @ts-expect-error category must be released
service.search('flights', query, structured);

// Existing SERP overloads remain available.
const legacy: Promise<string> = client.search.google('query');
void legacy;
