// ── Core ──────────────────────────────────────────────────────────
export {
    BRDError,
    ValidationError,
    AuthenticationError,
    ZoneError,
    NetworkError,
    NetworkTimeoutError,
    TimeoutError,
    FSError,
    APIError,
    DataNotReadyError,
} from './utils/errors.js';
export { PACKAGE_VERSION as VERSION } from './utils/constants.js';
export { bdclient } from './client.js';
export { BaseResult } from './models/result.js';
export { Deadline } from './utils/deadline.js';
export type { PollOptions } from './utils/polling.js';
export type { BaseResultFields } from './models/result.js';
export type * from './types/client.js';
export type * from './types/request.js';
export type * from './types/zones.js';
export type * from './types/discover.js';

// ── Discover ─────────────────────────────────────────────────────
export { DiscoverResult } from './api/discover/result.js';
export { DiscoverJob } from './api/discover/job.js';
export type { DiscoverResultItem, DiscoverResultFields } from './api/discover/result.js';
export type { DiscoverPollOptions } from './api/discover/job.js';

// ── Crawler ──────────────────────────────────────────────────────
export { CrawlerService } from './api/crawler/service.js';
export { CrawlResult } from './api/crawler/result.js';
export { ScrapeJob as CrawlJob } from './api/scrape/job.js';
export type { CrawlRecord, CrawlResultFields } from './api/crawler/result.js';
export type { CrawlOptions, CrawlDownloadOptions } from './schemas/crawler.js';

// ── Scraper Studio ──────────────────────────────────────────────
export { ScraperStudioService } from './api/scraperstudio/service.js';
export { ScraperStudioJob } from './api/scraperstudio/job.js';
export type { ScraperStudioPollOptions } from './api/scraperstudio/job.js';
export type {
    ScraperStudioRunOptions,
    ScraperStudioInput,
    JobStatus,
    RunResult,
} from './schemas/scraperstudio.js';

// ── Browser API ────────────────────────────────────────────────
export { BrowserService } from './api/browser/service.js';
export type { BrowserConnectOptions } from './schemas/browser.js';

// ── Subpath re-exports (backward compat) ─────────────────────────
// Consumers can also import these from '@brightdata/sdk/scrapers',
// '@brightdata/sdk/search', or '@brightdata/sdk/datasets'.
export * from './scrapers.js';
export * from './search.js';
export * from './datasets.js';
