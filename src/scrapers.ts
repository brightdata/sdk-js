// Scraper platform API: ScrapeRouter, ScrapeJob, results, platform filter types.
// Usage: import { ScrapeRouter, ScrapeJob } from '@brightdata/sdk/scrapers'

export { ScrapeJob } from './api/scrape/job';
export { ScrapeRouter } from './api/scrape/router';
export { ScrapeResult } from './models/result';
export type { ScrapeResultFields } from './models/result';
export type * from './types/datasets';
